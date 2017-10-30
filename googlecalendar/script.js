(function () {
    "use strict";

    const owner = (document["_currentScript"] || document.currentScript)
                                                                 .ownerDocument;

    const $    = require("jquery");
    const Cron = require("scronpt");

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

    document.registerElement("community-regseb-googlecalendar",
                             class extends HTMLElement {

        setFiles({ "config.json": config, "icon.svg": icon }) {
            this.cron      = new Cron(config.cron || "0 */4 * * *", false,
                                      this.update.bind(this));
            this.calendars = config.calendars || ["primary"];
            this.index     = config.index || 0;
            this.key       = config.key;
            this.secret    = config.secret;

            this.style.backgroundColor = config.color || "#3f51b5";
            if (undefined !== icon) {
                this.style.backgroundImage = "url(\"data:image/svg+xml;" +
                                             "base64," + btoa(icon) + "\")";
            }
            $("p a", this).attr("href", "https://www.google.com/calendar/b/" +
                                         (config.index || 0) + "/render");

            $("dialog input[type=\"url\"]", this).val(
                                             browser.identity.getRedirectURL());

            // Ajouter des écouteurs sur les boutons de connexion et
            // d'information.
            $("p button:first", this).click(this.open.bind(this));
            $("p button:last", this).click(this.info.bind(this));

            $("dialog input[type=\"button\"]", this).click(
                                                          this.copy.bind(this));
        }

        extract(calendars, size, token, index) {
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
        }

        display(data) {
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

            $("ul", this).append(
                $("<li>").append($("<time>").text(date.short)
                                            .attr("title", date.long))
                         .append($("<span>").text(time))
                         .append($("<a>").attr({ "href":   data.link,
                                                 "target": "_blank",
                                                 "title":  data.desc })
                                         .text(data.title)));
        }

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
            this.extract(this.calendars, this.size, this.token.access,
                         this.index).then(function (items) {
                if (0 === items.length) {
                    $("ul", that).hide();
                    $("p", that).show();
                } else {
                    $("p", that).hide();
                    $("ul", that).show()
                                 .empty();
                    for (const item of items) {
                        that.display(item);
                    }
                }
            });
        }

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
        }

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
        }

        open() {
            const details = {
                "url": OAUTH_API_URL + "auth?response_type=code&client_id=" +
                       this.key + "&redirect_uri=" +
                       encodeURIComponent(browser.identity.getRedirectURL()) +
                       "&scope=https://www.googleapis.com/auth/" +
                                                           "calendar.readonly" +
                       "&access_type=offline&prompt=select_account consent",
                "interactive": true
            };
            browser.identity.launchWebAuthFlow(details)
                            .then(this.access.bind(this));
        }

        info() {
            const dialog = $("dialog", this)[0];
            dialogPolyfill.registerDialog(dialog);
            dialog.showModal();
            $("dialog input[type=\"url\"]", this)[0].select();
        }

        copy() {
            $("dialog input[type=\"url\"]", this)[0].select();
            document.execCommand("copy");
        }

        wake() {
            if (!this.cron.status()) {
                this.update();
            }
        }

        createdCallback() {
            const template = owner.querySelector("template").content;
            const clone = owner.importNode(template, true);
            this.appendChild(clone);
        }

        attachedCallback() {
            this.size = parseInt(this.style.height, 10) / 14 - 1;
        }
    });
})();
