(function () {
    "use strict";

    const owner = (document["_currentScript"] || document.currentScript)
                                                                 .ownerDocument;

    const $    = require("jquery");
    const Cron = require("scronpt");

    const OAUTH_API_URL = "https://accounts.google.com/o/oauth2/v2/";
    const TOKEN_API_URL = "https://www.googleapis.com/oauth2/v4/";
    const GMAIL_API_URL = "https://www.googleapis.com/gmail/v1/";

    document.registerElement("community-regseb-gmail",
                             class extends HTMLElement {

        setFiles({ "config.json": config, "icon.svg": icon }) {
            this.cron = new Cron(config.cron, false, this.update.bind(this));
            this.index = config.index || 0;
            this.query = encodeURIComponent(config.query || "is:unread");
            this.key = config.key;
            this.secret = config.secret;

            this.style.backgroundColor = config.color || "#f44336";
            if (undefined !== icon) {
                this.style.backgroundImage = "url(\"data:image/svg+xml;" +
                                             "base64," + btoa(icon) + "\")";
            }
            $("p a", this).attr("href", "https://mail.google.com/mail/u/" +
                                        (config.index || 0));

            // Ajouter un écouteur sur le bouton de connexion.
            $("button", this).click(this.open.bind(this));
        } // setFiles()

        setScrapers() {
            // Ne rien faire.
        } // setScrapers()

        extract(size, token, query, index) {
            let url = GMAIL_API_URL + "users/me/messages?access_token=" +
                      token + "&q=" + query + "&maxResults=" + size;
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
        } // extract()

        display(data) {
            $("ul", this).append(
                $("<li>").html($("<a>").attr({ "href":   data.link,
                                               "target": "_blank",
                                               "title":  data.desc })
                                       .text(data.title)));
        } // display()

        update() {
            // Si la page est cachée : ne pas actualiser les données et indiquer
            // qu'il faudra mettre à jour les données quand l'utilisateur
            // reviendra sur la page.
            if (document.hidden) {
                this.cron.stop();
                return;
            }
            this.cron.start();

            const that = this;
            this.extract(this.size, this.token.access, this.query,
                         this.index).then(function (items) {
                if (0 === items.length) {
                    $("ul", that).hide();
                    $("p", that).show();
                } else {
                    $("p", that).hide();
                    $("ul", that).show()
                                 .empty();
                    for (let item of items) {
                        that.display(item);
                    }
                }
            });
        } // update()

        refresh() {
            const url = TOKEN_API_URL + "token";
            const params = {
                "refresh_token": this.token.refresh,
                "client_id":     this.key,
                "client_secret": this.secret,
                "grant_type":    "refresh_token"
            };
            const that = this;
            $.post(url, params).then(function (data) {
                that.token.access = data["access_token"];
                setTimeout(that.refresh.bind(that),
                           (data["expires_in"] - 60) * 1000);
            });
        } // refresh()

        access(responseUrl) {
            const response = new URL(responseUrl);
            const url = TOKEN_API_URL + "token";
            const params = {
                "code":          response.searchParams.get("code"),
                "client_id":     this.key,
                "client_secret": this.secret,
                "redirect_uri":  browser.identity.getRedirectURL(),
                "grant_type":    "authorization_code"
            };
            // Récupérer le jeton grâce au code.
            const that = this;
            $.post(url, params).then(function (data) {
                that.token = {
                    "refresh": data["refresh_token"],
                    "access":  data["access_token"]
                };
                // Préparer la prochaine requête (une minute avant l'expiration)
                // pour récupérer un nouveau jeton.
                setTimeout(that.refresh.bind(that),
                           (data["expires_in"] - 60) * 1000);

                $("button", that).hide();
                $("p a", that).show();

                document.addEventListener("visibilitychange",
                                          that.wake.bind(that));
                that.update();
            });
        } // access()

        open() {
            const details = {
                "url": OAUTH_API_URL + "auth?response_type=code&client_id=" +
                       this.key + "&redirect_uri=" +
                       encodeURIComponent(browser.identity.getRedirectURL()) +
                       "&scope=https://mail.google.com/,gmail.modify," +
                              "gmail.readonly" +
                       "&access_type=offline&prompt=select_account consent",
                "interactive": true
            };
            browser.identity.launchWebAuthFlow(details)
                            .then(this.access.bind(this));
        } // open()

        wake() {
            if (!this.cron.status()) {
                this.update();
            }
        } // wake()

        createdCallback() {
            const template = owner.querySelector("template").content;
            const clone = owner.importNode(template, true);
            this.appendChild(clone);
        } // createdCallback()

        attachedCallback() {
            this.size = parseInt(this.style.height, 10) / 14 - 1;
        } // attachedCallback()
    });
})();
