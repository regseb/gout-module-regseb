define(["jquery", "scronpt"], function ($, Cron) {
    "use strict";

    const OAUTH_API_URL = "https://accounts.google.com/o/oauth2/v2/";
    const TOKEN_API_URL = "https://www.googleapis.com/oauth2/v4/";
    const CALENDAR_API_URL = "https://www.googleapis.com/calendar/v3/";
    // dd/MM/yyyy.
    const DF_SHORT = new Intl.DateTimeFormat("fr-FR", {
        "day":   "2-digit",
        "month": "2-digit",
        "year":  "numeric"
    });
    // EEEEE dd MMMMM yyyy.
    const DF_LONG = new Intl.DateTimeFormat("fr-FR", {
        "weekday": "long",
        "day":     "2-digit",
        "month":   "long",
        "year":    "numeric"
    });
    const TF = new Intl.DateTimeFormat("fr-FR", {
        "hour":   "2-digit",
        "minute": "2-digit"
    });

    const gates = {};

    const extract = function (calendars, size, token, index) {
        const promises = calendars.map(function (calendar) {
            const url = CALENDAR_API_URL + "calendars/" +
                        encodeURIComponent(calendar) + "/events?access_token=" +
                        token + "&maxResults=" + size + "&orderBy=startTime" +
                        "&singleEvents=true&timeMin=" +
                        new Date().toISOString();
            return $.getJSON(url).then(function (data) {
                return data.items.map(function (item) {
                    let date;
                    let time;
                    if ("date" in item.start) {
                        date = new Date(item.start.date);
                        date.setHours(0, 0, 0, 0);
                        time = null;
                    } else {
                        date = new Date(item.start.dateTime);
                        time = new Date(item.start.dateTime);
                    }

                    return {
                        "title": item.summary,
                        "desc":  item.description,
                        "link":  item.htmlLink.replace("/calendar",
                                                       "/calendar/b/" + index),
                        "date":  date,
                        "time":  time
                    };
                });
            });
        });
        return Promise.all(promises).then(function (items) {
            let prev = null;
            return [].concat(...items).sort(function (a, b) {
                return a.date.getTime() - b.date.getTime();
            }).slice(0, size).map(function (item) {
                if (null !== prev &&
                        prev.getDate() === item.date.getDate() &&
                        prev.getMonth() === item.date.getMonth() &&
                        prev.getFullYear() === item.date.getFullYear()) {
                    item.date = null;
                } else {
                    prev = item.date;
                }
                return item;
            });
        });
    }; // extract()

    const display = function ($root, data) {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const date = {};
        if (null === data.date) {
            date.short = "";
        } else if (today.getDate() === data.date.getDate() &&
                today.getMonth() === data.date.getMonth() &&
                today.getFullYear() === data.date.getFullYear()) {
            date.short = "Aujourd'hui";
        } else if (tomorrow.getDate() === data.date.getDate() &&
                tomorrow.getMonth() === data.date.getMonth() &&
                tomorrow.getFullYear() === data.date.getFullYear()) {
            date.short = "Demain";
        } else {
            date.short = DF_SHORT.format(data.date);
        }
        date.long = DF_LONG.format(data.date);

        let time;
        if (null === data.time) {
            time = "-";
        } else {
            time = TF.format(data.time);
        }

        $("ul", $root).append(
            $("<li>").append($("<time>").text(date.short)
                                        .attr("title", date.long))
                     .append($("<span>").text(time))
                     .append($("<a>").attr({ "href":   data.link,
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
        extract(args.calendars, args.size, args.token, args.index).then(
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
                   "&scope=https://www.googleapis.com/auth/calendar.readonly" +
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
        $root.css("background-color", config.color || "#3f51b5");
        if (undefined !== icon) {
            $root.css("background-image", "url(\"data:image/svg+xml;base64," +
                                          btoa(icon) + "\")");
        }
        $("p a", $root).attr("href", "https://www.google.com/calendar/b/" +
                                     (config.index || 0) + "/render");

        // Ajouter un écouteur sur le bouton de connexion.
        $("button", $root).click(open);

        gates[id] = {
            "calendars": config.calendars || ["primary"],
            "index":     config.index || 0,
            "key":       config.key,
            "secret":    config.secret,
            "size":      $root.height() / 14 - 1,
            "cron":      new Cron(config.cron || "0 */4 * * *", update, id)
        };

        if (1 === Object.keys(gates).length) {
            document.addEventListener("visibilitychange", wake);
        }
    }; // create()

    return create;
});
