fetch("module/community/regseb/betaseries/index.html").then(
                                                           function (response) {
    return response.text();
}).then(function (data) {
    return new DOMParser().parseFromString(data, "text/html")
                          .querySelector("template");
}).then(function (template) {
    const API_URL = "https://api.betaseries.com/";
    const IMG_DIR = "module/community/regseb/betaseries/img/";

    const $    = require("jquery");
    const Cron = require("scronpt");

    customElements.define("community-regseb-betaseries",
                          class extends HTMLElement {

        set files({ "config.json": config, "icon.svg": icon }) {
            this._config = config;
            this._icon   = icon;
        }

        extract(size, key, token, shows) {
            const that = this;
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
                            "link":    that.resources[show.id] +
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
        }

        display(data) {
            const text = this.format
                    .replace("{show}", data.show)
                    .replace("{season}",
                             data.season.toString().padStart(2, "0"))
                    .replace("{episode}",
                             data.episode.toString().padStart(2, "0"))
                    .replace("{title}", data.title);

            const $li = $("<li>");
            $li.data({ "guid":   data.guid,
                       "status": data.status });

            const $img = $("<img>").click(this.post.bind(this));
            if ("download" === data.status) {
                $img.attr({ "src":   IMG_DIR + "record.svg",
                            "title": "Marquer comme récupéré" });
            } else {
                $img.attr({ "src":   IMG_DIR + "play.svg",
                            "title": "Marquer comme vu" });
            }
            $li.append($img)
               .append($("<a>").attr({ "href":   data.link,
                                       "target": "_blank" })
                               .text(text))
               .append($("<span>").text(data.desc));

            $("ul", this).append($li);
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
        }

        post(event) {
            const $li = $(event.target).closest("li");
            const guid = $li.data("guid");
            const status = $li.data("status");

            const url = API_URL + "episodes/" + status + "ed?key=" + this.key +
                        "&token=" + this.token + "&id=" + guid;
            $.post(url).then(this.update.bind(this));
        }

        init(key, token, shows) {
            // Récupérer les identifiants des séries regardées par
            // l'utilisateur.
            const that = this;
            let url = API_URL + "episodes/list?key=" + key + "&token=" + token +
                      "&limit=1";
            $.getJSON(url).then(function (data) {
                // Filtrer les séries non-affichées dans ce widget.
                const promises = data.shows.filter(function (show) {
                    return null === shows || shows.includes(show.title);
                }).map(function (show) {
                    // Récupérer l'URL vers les pages Internet des épisodes.
                    url = API_URL + "shows/display?key=" + key + "&id=" +
                          show.id;
                    return $.getJSON(url).then(function (infos) {
                        that.resources[show.id] =
                                infos.show["resource_url"]
                                         .replace("/serie/", "/episode/") + "/";
                    });
                });
                return Promise.all(promises);
            }).then(this.update.bind(this));
        }

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
        }

        open() {
            const details = {
                "url": "https://www.betaseries.com/authorize?client_id=" +
                       this.key + "&redirect_uri=" +
                       encodeURIComponent(browser.identity.getRedirectURL()),
                "interactive": true
            };
            browser.identity.launchWebAuthFlow(details)
                            .then(this.access.bind(this));
        }

        wake() {
            if (!this.cron.status()) {
                this.update();
            }
        }

        connectedCallback() {
            this.appendChild(template.content.cloneNode(true));
            this.size = parseInt(this.style.height, 10) / 14 - 1;

            this.cron = new Cron(this._config.cron || "0 0 * * *", false,
                                 this.update.bind(this));
            this.shows = this._config.shows || null;
            this.format = this._config.format ||
                                       "s{season}e{episode} : {title} ({show})";
            this.key = this._config.key;
            this.secret = this._config.secret;
            this.resources = {};

            this.style.backgroundColor = this._config.color || "#2196f3";
            if (undefined !== this._icon) {
                this.style.backgroundImage = "url(\"data:image/svg+xml;" +
                                             "base64," + btoa(this._icon) +
                                             "\")";
            }

            // Ajouter un écouteur sur le bouton de connexion.
            $("button", this).click(this.open.bind(this));
        }
    });
});
