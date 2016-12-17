define(["jquery", "scronpt"], function ($, Cron) {
    "use strict";

    const OAUTH_API_URL = "https://accounts.google.com/o/oauth2/v2/";
    const TOKEN_API_URL = "https://www.googleapis.com/oauth2/v4/";
    const GMAIL_API_URL = "https://www.googleapis.com/gmail/v1/";

    const gates = {};

    const extract = function (size, token, query, index) {
        let url = GMAIL_API_URL + "users/me/messages?access_token=" + token +
                  "&q=" + query + "&maxResults=" + size;
        return $.get(url).then(function (data) {
            if (0 === data.resultSizeEstimate) {
                return [];
            }

            return Promise.all(data.messages.map(function (message) {
                url = GMAIL_API_URL + "users/me/messages/" + message.id +
                      "?access_token=" + token + "&format=metadata";
                return $.getJSON(url).then(function (item) {
                    const headers = {};
                    for (let header of item.payload.headers) {
                        headers[header.name] = header.value;
                    }
                    return {
                        "title": headers.Subject,
                        "desc":  item.snippet,
                        "link":  "https://mail.google.com/mail/u/" + index +
                                 "/#inbox/" + item.id
                    };
                });
            }));
        });
    }; // extract()

    const display = function ($root, data) {
        $("ul", $root).append(
            $("<li>").html($("<a>").attr({ "href":   data.link,
                                           "target": "_blank",
                                           "title":  data.desc })
                                   .text(data.title)));
    }; // display()

    const update = function (id) {
        const args = gates[id];

        // Si la page est cachée : ne pas actualiser les données et indiquer
        // qu'il faudra mettre à jour les données quand l'utilisateur reviendra
        // sur la page.
        if (document.hidden) {
            args.cron.stop();
            return;
        }
        args.cron.start();

        const $root = $("#" + id);
        extract(args.size, args.token, args.query, args.index).then(
                                                              function (items) {
            if (0 === items.length) {
                $("ul", $root).hide();
                $("p", $root).show();
            } else {
                $("p", $root).hide();
                $("ul", $root).show()
                              .empty();
                for (let item of items) {
                    display($root, item);
                }
            }
        });
    }; // update()

    const refresh = function (id) {
        const args = gates[id];

        const url = TOKEN_API_URL + "token";
        const params = {
            "refresh_token": args.refresh,
            "client_id":     args.key,
            "client_secret": args.secret,
            "grant_type":    "refresh_token"
        };
        $.post(url, params).then(function (data) {
            args.token = data["access_token"];
            setTimeout(refresh, (data["expires_in"] - 60) * 1000, id);
        });
    }; // refresh()

    const access = function (responseUrl) {
        const response = new URL(responseUrl);
        const id = response.searchParams.get("state");
        const $root = $("#" + id);
        const args = gates[id];

        const url = TOKEN_API_URL + "token";
        const params = {
            "code":          response.searchParams.get("code"),
            "client_id":     args.key,
            "client_secret": args.secret,
            "redirect_uri":  browser.identity.getRedirectURL(),
            "grant_type":    "authorization_code"
        };
        // Récupérer le jeton grâce au code.
        $.post(url, params).then(function (data) {
            args.refresh = data["refresh_token"];
            args.token = data["access_token"];
            // Préparer la prochaine requête (une minute avant l'expiration)
            // pour récupérer un nouveau jeton.
            setTimeout(refresh, (data["expires_in"] - 60) * 1000, id);

            $("button", $root).hide();
            $("p a", $root).show();

            update(id);
        });
    }; // access()

    const open = function () {
        const $root = $(this).closest("article");
        const id = $root.attr("id");
        const args = gates[id];

        const details = {
            "url": OAUTH_API_URL + "auth?response_type=code&client_id=" +
                   args.key + "&redirect_uri=" +
                   encodeURIComponent(browser.identity.getRedirectURL()) +
                   "&scope=https://mail.google.com/,gmail.modify," +
                          "gmail.readonly" +
                   "&state=" + id + "&access_type=offline" +
                   "&prompt=select_account consent",
            "interactive": true
        };
        browser.identity.launchWebAuthFlow(details).then(access);
    }; // open()

    const wake = function () {
        for (let id in gates) {
            if (!gates[id].cron.status()) {
                update(id);
            }
        }
    }; // wake()

    const create = function (id, { "config.json": config, "icon.svg": icon }) {
        const $root = $("#" + id);
        $root.css("background-color", config.color || "#f44336");
        if (undefined !== icon) {
            $root.css("background-image", "url(\"data:image/svg+xml;base64," +
                                          btoa(icon) + "\")");
        }
        $("p a", $root).attr("href", "https://mail.google.com/mail/u/" +
                                     (config.index || 0));

        // Ajouter un écouteur sur le bouton de connexion.
        $("button", $root).click(open);

        gates[id] = {
            "index":  config.index || 0,
            "query":  encodeURIComponent(config.query || "is:unread"),
            "key":    config.key,
            "secret": config.secret,
            "size":   $root.height() / 14 - 1,
            "cron":   new Cron(config.cron, update, id)
        };

        if (1 === Object.keys(gates).length) {
            document.addEventListener("visibilitychange", wake);
        }
    }; // create()

    return create;
});
