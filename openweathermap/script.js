(function () {
    "use strict";

    const owner = (document["_currentScript"] || document.currentScript)
                                                                 .ownerDocument;

    const $    = require("jquery");
    const Cron = require("scronpt");

    const API_URL = "http://api.openweathermap.org/data/2.5/";
    const IMG_DIR = "widget/community/regseb/openweathermap/img/";

    const extract = function (city, appid, kind) {
        // Si c'est la météo du jour qui est demandée.
        if ("weather" === kind) {
            const url = API_URL + "weather?q=" + city +
                        "&units=metrics&lang=fr&APPID=" + appid;
            return $.getJSON(url).then(function (data) {
                return {
                    "icon": data.weather[0].icon,
                    "desc": data.weather[0].description,
                    "help": data.weather[0].main,
                    "temp": {
                        "min": Math.round(data.main["temp_min"] - 273.15),
                        "max": Math.round(data.main["temp_max"] - 273.15)
                    },
                    "wind": {
                        "speed": Math.round(data.wind.speed * 3.6),
                        "deg":   data.wind.deg + 360 % 360
                    }
                };
            });
        }
        // Sinon : c'est les prévisions.
        const url = API_URL + "forecast/daily?q=" + city +
                    "&units=metrics&lang=fr&cnt=2&APPID=" + appid;
        return $.getJSON(url).then(function (data) {
            const items = [];
            for (const item of data.list) {
                items.push({
                    "icon": item.weather[0].icon,
                    "desc": item.weather[0].description,
                    "help": item.weather[0].main,
                    "temp": { "min": Math.round(item.temp.min - 273.15),
                              "max": Math.round(item.temp.max - 273.15) },
                    "wind": { "speed": Math.round(item.speed * 3.6),
                              "deg":   item.deg + 360 % 360 }
                });
            }
            return items;
        });
    }; // extract()

    document.registerElement("community-regseb-openweathermap",
                             class extends HTMLElement {

        setFiles({ "config.json": config }) {
            this.cron = new Cron(config.cron || "0 * * * *",
                                 this.update.bind(this));
            this.city = config.city;
            this.appid = config.appid;

            this.style.backgroundColor = config.color || "#03a9f4";
            $("h1", this).text(config.title || this.city.split(",")[0]);
        } // setFiles()

        display(data) {
            const $li = $("<li>");
            let $p = $("<p>");

            const date = new Date();
            date.setDate(date.getDate() +  $("li", this).length);
            $p.append($("<strong>").text(
                date.toLocaleString("fr-FR", { "weekday": "long" })));

            $p.append($("<img>", { "src":    IMG_DIR + data.icon + ".svg",
                                   "alt":    data.desc,
                                   "title":  data.help,
                                   "width":  32,
                                   "height": 32 }));

            $li.append($p);

            $p = $("<p>");

            $p.append($("<span>").addClass("temp")
                                 .text(data.temp.min + " / " +
                                       data.temp.max + " °C"));

            let dir = "";
            if (22.5 > data.wind.deg) {
                dir = "nord";
            } else if (67.5  > data.wind.deg) {
                dir = "nord-est";
            } else if (112.5 > data.wind.deg) {
                dir = "est";
            } else if (157.5 > data.wind.deg) {
                dir = "sud-est";
            } else if (202.5 > data.wind.deg) {
                dir = "sud";
            } else if (247.5 > data.wind.deg) {
                dir = "sud-ouest";
            } else if (292.5 > data.wind.deg) {
                dir = "ouest";
            } else if (337.5 > data.wind.deg) {
                dir = "nord-ouest";
            } else {
                dir = "nord";
            }
            const $dir = $("<img>").attr({ "src":   IMG_DIR + "wind.svg",
                                           "alt":   "^",
                                           "title": dir })
                                   .css("transform",
                                        "rotate(" + data.wind.deg + "deg)");

            $p.append($("<span>").addClass("wind")
                                 .append($dir)
                                 .append(data.wind.speed + " km/h"));

            $li.append($p);

            $("ul", this).append($li);
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

            $("ul", this).empty();

            // Récupérer la météo du jour.
            extract(this.city, this.appid, "weather").then(
                                                       this.display.bind(this));

            // Récupérer les prévisions.
            const that = this;
            extract(this.city, this.appid, "forecast").then(function (items) {
                items.forEach(that.display.bind(that));
            });
        } // update()

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
            document.addEventListener("visibilitychange", this.wake.bind(this));
            this.update();
        } // attachedCallback()
    });
})();
