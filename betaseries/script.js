(function () {
    "use strict";

    const owner = (document["_currentScript"] || document.currentScript)
                                                                 .ownerDocument;

    const API_URL = "https://api.betaseries.com/";

    const $    = require("jquery");
    const Cron = require("scronpt");

    document.registerElement("community-regseb-betaseries",
                             class extends HTMLElement {

        setFiles({ "config.json": config, "icon.svg": icon }) {
            this.cron = new Cron(config.cron || "0 0 * * *", false,
                                 this.update.bind(this));
            this.shows = config.shows || null;
            this.format = config.format ||
                                       "s{season}e{episode} : {title} ({show})";
            this.key = config.key;
            this.secret = config.secret;

            this.style.backgroundColor = config.color || "#2196f3";
            if (undefined !== icon) {
                this.style.backgroundImage = "url(\"data:image/svg+xml;" +
                                             "base64," + btoa(icon) + "\")";
            }

            // Ajouter un écouteur sur le bouton de connexion.
            $("button", this).click(this.open.bind(this));
        } // setFiles()

        extract(size, key, token, shows) {
            const url = API_URL + "episodes/list?key=" + key + "&token=" +
                        token + "&limit=" + size;
            return $.getJSON(url).then(function (data) {
                const items = [];
                for (const show of data.shows) {
                    if (null !== shows && !shows.includes(show.title)) {
                        continue;
                    }
                    for (const item of show.unseen) {
                        items.push({
                            "title":   item.title,
                            "desc":    item.description,
                            "season":  item.season,
                            "episode": item.episode,
                            "show":    show.title,
                            "link":    this.resources[show.id] +
                                       item.code.toLowerCase(),
                            "guid":    item.id,
                            "status":  item.user.downloaded ? "watch"
                                                            : "download",
                            "date":    new Date(item.date).getTime()
                        });
                    }
                }
                return items.sort((a, b) => a.date - b.date).slice(0, size);
            });
        } // extract()

        display(data) {
            const $img = $("<button>").click(this.post.bind(this));
            if ("download" === data.status) {
                $img.attr("title", "Marquer comme récupéré")
                    .text("●");
            } else {
                $img.attr("title", "Marquer comme vu")
                    .text("▶");
            }

            const text = this.format.replace("{show}", data.show)
                                    .replace("{season}",
                                             data.season.padStart(2, "0"))
                                    .replace("{episode}",
                                             data.episode.padStart(2, "0"))
                                    .replace("{title}", data.title);

            $("ul", this).append(
                $("<li>").data({ "guid":   data.guid,
                                 "status": data.status })
                         .append($img)
                         .append($("<a>").attr({ "href":   data.link,
                                                 "target": "_blank",
                                                 "title":  data.desc })
                                         .text(text)));
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
            this.extract(this.size, this.key, this.token, this.shows)
                                                        .then(function (items) {
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
        } // update()

        post(event) {
            const $li = $(event.target).closest("li");
            const guid = $li.data("guid");
            const status = $li.data("status");

            const url = API_URL + "episodes/" + status + "ed?key=" + this.key +
                        "&token=" + this.token + "&id=" + guid;
            $.post(url).then(this.update.bind(this));
        } // post()

        init(key, token, shows) {
            // Récupérer les identifiants des séries regardées par
            // l'utilisateur.
            let url = API_URL + "episodes/list?key=" + key + "&token=" + token +
                      "&limit=1";
            $.getJSON(url).then(function (data) {
                // Filtrer les séries non-affichées dans cette passerelle.
                const promises = data.shows.filter(function (show) {
                    return !(show.id in this.resources) &&
                           (null === shows || shows.includes(show.title));
                }).map(function (show) {
                    // Récupérer l'URL vers les pages Internet des épisodes.
                    url = API_URL + "shows/display?key=" + key + "&id=" +
                          show.id;
                    return $.getJSON(url).then(function (infos) {
                        this.resources[show.id] =
                                infos.show["resource_url"]
                                         .replace("/serie/", "/episode/") + "/";
                    });
                });
                return Promise.all(promises);
            }).then(this.update.bind(this));
        } // init()

        access(responseUrl) {
            const response = new URL(responseUrl);

            const url = API_URL + "members/access_token?key=" + this.key;
            const params = {
                "client_id":     this.key,
                "client_secret": this.secret,
                "redirect_uri":  browser.identity.getRedirectURL(),
                "code":          response.searchParams.get("code")
            };
            // Récupérer le jeton grâce au code.
            const that = this;
            $.post(url, params).then(function (data) {
                that.token = data.token;

                $("button", that).hide();
                $("p a", that).show();

                document.addEventListener("visibilitychange",
                                          that.wake.bind(that));
                that.init(that.key, that.token, that.shows);
            });
        } // access()

        open() {
            const details = {
                "url": "https://www.betaseries.com/authorize?client_id=" +
                       this.key + "&redirect_uri=" +
                       encodeURIComponent(browser.identity.getRedirectURL()),
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
