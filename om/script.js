fetch("module/community/regseb/om/index.html").then(function (response) {
    return response.text();
}).then(function (data) {
    return new DOMParser().parseFromString(data, "text/html")
                          .querySelector("template");
}).then(function (template) {
    const $    = require("jquery");
    const Cron = require("scronpt");

    const IMG_DIR = "module/community/regseb/om/img/";
    const TOURNAMENTS = {
        "amical":            "Amical",
        "coupe_france":      "Coupe de France",
        "coupe_ligue":       "Coupe de la Ligue",
        "ligue_1":           "Ligue 1",
        "ligue_champions":   "Ligue des Champions",
        "ligue_europa":      "Ligue Europa",
        "trophee_champions": "Trophée des Champions",
        "trophee_rld":       "Trophée Robert Louis-Dreyfus",
        "unknown":           "Inconnue"
    };
    const CHANNELS = {
        "bein1":                  "Bein Sports 1",
        "bein2":                  "Bein Sports 2",
        "canalplus":              "Canal+",
        "canalplussport":         "Canal+ Sport",
        "canalplus_bein1":        "Canal+ / Bein Sports 1",
        "canalplussport_bein1":   "Canal+ Sport / Bein Sports 1",
        "eurosport1":             "Eurosport 1",
        "eurosport2":             "Eurosport 2",
        "footplus":               "Foot+",
        "france2":                "France 2",
        "france3":                "France 3",
        "france3_canalplussport": "France 3 / Canal+ Sport",
        "france4":                "France 4",
        "omnet":                  "OM.net",
        "undisclosed":            "Non communiquée",
        "unknown":                "Inconnue",
        "w9":                     "W9",
        "w9_bein1":               "W9 / Bein Sports 1"
    };
    // dd/MM HH:mm.
    const DTF_SHORT = new Intl.DateTimeFormat("fr-FR", {
        "day":    "2-digit",
        "month":  "2-digit",
        "hour":   "2-digit",
        "minute": "2-digit"
    });
    // EEEEE dd MMMMM yyyy HH:mm.
    const DTF_LONG = new Intl.DateTimeFormat("fr-FR", {
        "weekday": "long",
        "day":     "2-digit",
        "month":   "long",
        "year":    "numeric",
        "hour":    "2-digit",
        "minute":  "2-digit"
    });

    const reckonTournament = function (id) {
        switch (id) {
            case "480": return "trophee_rld";
            case "483": return "ligue_europa";
            case "484": return "coupe_france";
            case "485": return "trophee_champions";
            case "487": return "ligue_1";
            case "492": return "ligue_champions";
            case "514": return "amical";
            case "521": return "coupe_ligue";
            default:    return "unknown";
        }
    };

    const reckonChannel = function ($img) {
        if (0 === $img.length) {
            return "undisclosed";
        }
        switch (/\/([^/]+)\.png$/.exec($img.attr("data-src"))[1]) {
            case "150717_foot_plus":            return "footplus";
            case "150727_cplusport":            return "canalplussport";
            case "150916_bein2_ok_0":           return "bein2";
            case "beinsport1-transparent":      return "bein1";
            case "canalplus-logo-ok-min":       return "canalplus";
            case "canal-beinsport1-min":        return "canalplus_bein1";
            case "canal-plus-sport-beinsport1": return "canalplussport_bein1";
            case "eurosport_1":                 return "eurosport1";
            case "eurosport_2":                 return "eurosport2";
            case "france2-logo-ok-min":         return "france2";
            case "france3_canalplussport":      return "france3_canalplussport";
            case "france3-logo-ok-min":         return "france3";
            case "france4-logo-ok-min":         return "france4";
            case "logo-omnet":                  return "omnet";
            case "logo-w9-min":                 return "w9";
            case "w9-beinsport1-min":           return "w9_bein1";
            default:                            return "unknown";
        }
    };

    const extract = function () {
        const url = "https://www.om.net/calendrier-resultats";
        return $.get(url).then(function (data) {
            return $.parseHTML(data);
        }).then(function (data) {
            const $last = $(".current-match", data);
            const last = {
                "link":       "https://www.om.net" +
                              $(".about-match", $last).attr("href"),
                "tournament": reckonTournament($last.attr("data-competition")),
                "host":       {
                    "name":  $(".field-visuel span:first", $last).text(),
                    "score": parseInt($(".host span", $last).text(), 10)
                },
                "guest":      {
                    "name":  $(".field-visuel span:last", $last).text(),
                    "score": parseInt($(".guest span", $last).text(), 10)
                }
            };
            const $next = $last.nextAll(":not(.om-row-month-title):first",
                                        data);
            let next = null;
            if (0 !== $next.length) {
                // Récupérer les informations de la date.
                const year = parseInt($(".year", $next).text(), 10);
                const month = parseInt($next.attr("data-month"), 10) - 1;
                const day = parseInt($(".day", $next).text(), 10);
                const parts = $(".time", $next).text().split(":");
                const hour = parseInt(parts[0], 10);
                const minute = parseInt(parts[1], 10);

                next = {
                    "link":       "https://www.om.net" +
                                  $(".presentation-match", $next).attr("href"),
                    "tournament": reckonTournament(
                                                $next.attr("data-competition")),
                    "host":       $(".field-visuel span:first", $next).text(),
                    "guest":      $(".field-visuel span:last", $next).text(),
                    "date":       new Date(year, month, day, hour, minute),
                    "channel":    reckonChannel($(".live-img", $next))
                };
            }

            return { last, next };
        });
    };

    customElements.define("community-regseb-om", class extends HTMLElement {

        set files({ "config.json": config }) {
            this._config = config;
        }

        display(data) {
            // Afficher le dernier match joué.
            const $last = $("p:first", this);
            const last = data.last;
            let tournament = last.tournament;
            $("img", $last).attr({ "src":   IMG_DIR + tournament + ".svg",
                                   "alt":   TOURNAMENTS[tournament],
                                   "title": TOURNAMENTS[tournament] });
            $("a", $last).attr("href",  last.link)
                         .text(last.host.name + " " + last.host.score + " - " +
                               last.guest.score + " " + last.guest.name);

            // Afficher l'éventuel prochain match.
            const $next = $("p:last", this);
            if (null === data.next) {
                $("a", $next).attr("href", "https://www.om.net/")
                             .text("(Aucun match programmé)");
            } else {
                const next = data.next;
                const channel = next.channel;
                tournament = next.tournament;
                $("img:first", $next).attr({
                    "src":   IMG_DIR + tournament + ".svg",
                    "alt":   TOURNAMENTS[tournament],
                    "title": TOURNAMENTS[tournament]
                });
                $("a", $next).attr("href", data.next.link)
                             .text(next.host + " - " + next.guest);
                $("time", $next).attr("title", DTF_LONG.format(next.date))
                                .text(DTF_SHORT.format(next.date));
                $("img:last", $next).attr({ "src":   IMG_DIR + channel + ".svg",
                                            "alt":   CHANNELS[channel],
                                            "title": CHANNELS[channel] });
            }
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

            extract().then(this.display.bind(this));
        }

        wake() {
            if (!this.cron.status()) {
                this.update();
            }
        }

        connectedCallback() {
            this.appendChild(template.content.cloneNode(true));

            // Par défaut, mettre à jour tous les matins à 7h.
            this.cron = new Cron(this._config.cron || "0 7 * * *",
                                 this.update.bind(this));

            this.style.backgroundColor = this._config.color || "#03a9f4";

            document.addEventListener("visibilitychange", this.wake.bind(this));
            this.update();
        }
    });
});
