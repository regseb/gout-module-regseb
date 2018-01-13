fetch("module/community/regseb/tv/index.html").then(function (response) {
    return response.text();
}).then(function (data) {
    return new DOMParser().parseFromString(data, "text/html")
                          .querySelector("template");
}).then(function (template) {
    const $    = require("jquery");
    const Cron = require("scronpt");

    const IMG_DIR = "module/community/regseb/tv/img/";

    customElements.define("community-regseb-tv", class extends HTMLElement {

        set files({ "config.json": config }) {
            this._config = config;
        }

        set scrapers(scrapers) {
            this._scraper = scrapers[0];
        }

        display(data) {
            const $mark = $("<span>");
            for (let i = 0; i < data.mark; ++i) {
                $mark.append($("<img>").attr({
                    "src": IMG_DIR + "star.svg",
                    "alt": "*"
                }));
            }
            const text = data.title +
                         ("" === data.subtitle ? ""
                                               : " - " + data.subtitle);

            $("ul", this).append(
                $("<li>").append($("<img>").attr({ "src":   IMG_DIR +
                                                            data.channel +
                                                            ".svg",
                                                   "alt":   data.name,
                                                   "title": data.name }))
                         .append($("<img>").attr({ "src":   IMG_DIR +
                                                            data.type + ".svg",
                                                   "alt":   data.type,
                                                   "title": data.category })
                                           .addClass(data.type))
                         .append($mark)
                         .append($("<a>").text(text)
                                         .attr({ "href":   data.link,
                                                 "target": "_blank",
                                                 "title":  data.desc })));
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
            this._scraper.extract().then(function (items) {
                $("ul", that).empty();
                items.forEach(that.display.bind(that));
            });
        }

        wake() {
            if (!this.cron.status()) {
                this.update();
            }
        }

        connectedCallback() {
            this.appendChild(template.content.cloneNode(true));

            // Mettre à jour les données tous les jours à 1h.
            this.cron = new Cron(this._config.cron || "0 1 * * *",
                                 this.update.bind(this));

            this.style.backgroundColor = this._config.color || "#9e9e9e";

            document.addEventListener("visibilitychange", this.wake.bind(this));
            this.update();
        }
    });
});
