(function () {
    "use strict";

    const owner = (document["_currentScript"] || document.currentScript)
                                                                 .ownerDocument;

    const $    = require("jquery");
    const Cron = require("scronpt");

    const IMG_DIR = "widget/community/regseb/tv/img/";

    document.registerElement("community-regseb-tv", class extends HTMLElement {

        setFiles({ "config.json": config }) {
            // Mettre à jour les données tous les jours à 1h.
            this.cron = new Cron(config.cron || "0 1 * * *",
                                 this.update.bind(this));

            this.style.backgroundColor = config.color || "#9e9e9e";
        }

        setScrapers(scrapers) {
            this.scraper = scrapers[0];
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
            this.scraper.extract().then(function (items) {
                $("ul", that).empty();
                items.forEach(that.display.bind(that));
            });
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
            document.addEventListener("visibilitychange", this.wake.bind(this));
            this.update();
        }
    });
})();
