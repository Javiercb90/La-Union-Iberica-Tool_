"use strict";
if (!galaxytoolbar) var galaxytoolbar = {};
if (!galaxytoolbar.GTPlugin_galaxyview) galaxytoolbar.GTPlugin_galaxyview = {};

galaxytoolbar.GTPlugin_galaxyview = {

    get_galaxyview_data: function(docroot, pos) {

        this.addEspionageActionListener(docroot);
        var rows;

        var moonsize, metal_debris, crystal_debris, playerid, playerstatus, playername;
        var planetname, player_rank, alliance, alliance_rank, alliance_member, alliance_id;
        var position = 0;
        var galaxy_xml = "";
        var planet_activity, moon_activity = -1; // not active = -1
        var url = docroot.location.host;
        var tmp, playerinfo, allyinfo;
        var ogame_servertime = galaxytoolbar.GTPlugin_general.get_ogame_time(docroot);
        var og500 = galaxytoolbar.GTPlugin_general.compare_ogame_version_with(docroot, 8, 0, 0);

        try {
            rows = docroot.getElementsByClassName('galaxy-grid-row');
        } catch (e) {
            galaxytoolbar.GTPlugin_general.set_status(docroot, "galaxyplugin" + 1, 0, "Unexpected error: no galaxy table found", "All Galaxytools");
            return false;
        }

        try {
            for (var i = 1; i < rows.length; i++) {
                // reset data
                position = 0;
                moonsize = 0;
                metal_debris = 0;
                crystal_debris = 0;
                playerid = 0;
                playerstatus = "";
                playername = "";
                planetname = "";
                player_rank = 0;
                alliance = "";
                alliance_rank = 0;
                alliance_member = 0;
                alliance_id = 0;
                planet_activity = -1;
                moon_activity = -1;
                playerinfo = null;
                allyinfo = null;

                // planet position
                //position = rows[i].getAttribute("id").replace("galaxyRow", "");
				// there are max. 15 positions in a system
                if (i > 15) {
                    break;
                }
				position = rows[i].getAttribute('data-info').replace("p_", "");
                

                if (rows[i].querySelector(".galaxy-planet > a") === null) {
                    //no player at this position
                    if (galaxy_xml == "") {
                        galaxy_xml += '\t<galaxyview galaxy="' + pos[0] + '" system="' + pos[1] + '">\n';
                    }
					if (rows[i].querySelector(".galaxy-debris > .galaxy-debris-text") !== null) {
						tmp = this.get_debris(rows[i].querySelector(".galaxy-debris > .galaxy-debris-text").innerHTML.trim());
						metal_debris = tmp[0];
						crystal_debris = tmp[1];
					}
                    if (metal_debris > 0 || crystal_debris > 0) {
                        galaxy_xml += '\t\t<position pos="' + position + '">\n';
                        galaxy_xml += '\t\t\t<debris metal="' + metal_debris + '" crystal="' + crystal_debris + '"/>\n';
                        galaxy_xml += '\t\t</position>\n';
                    } else {
                        galaxy_xml += '\t\t<position pos="' + position + '"/>\n';
                    }
                    continue;
                }

				
                // activity
                try {
					tmp = rows[i].querySelector(".galaxy-planet > a").innerHTML.trim();
					tmp = tmp.substring(tmp.indexOf("> ")+2);
					var dentro = tmp.match(/\((.*?)\)$/)?.[1];
					var planetname = tmp.replace(/\s*\(.*?\)$/, "");
					if (dentro.includes(" min")) {
						tmp = dentro.match(/(\d+)\s*min/)?.[1];
						planet_activity = parseInt(tmp);
					}else if(dentro=="*"){
						planet_activity=0;
					}
    
					//TODO falta cuando pone minutos
/*					
                    // Activity is inside the tooltip
                    if (rows[i].querySelector(".planetTooltip > .activity") !== null) {
                        //Activity label exists
                        activityContent = rows[i].querySelector(".planetTooltip > .activity").innerHTML.trim();

                        if (activityContent > 0) {
                            //has a number in tooltip
                            planet_activity = parseInt(rows[i].querySelector(".planetTooltip > .activity").innerHTML.trim());
                        } else {
                            //active right now
                            planet_activity = 7;
                        }
                    }

                    if (rows[i].querySelector(".micromoon > .activity") !== null) {
                        //Activity label exists
                        activityContent = rows[i].querySelector(".micromoon > .activity").innerHTML.trim();

                        if (activityContent > 0) {
                            //has a number in tooltip
                            moon_activity = parseInt(rows[i].querySelector(".micromoon > .activity").innerHTML.trim());
                        } else {
                            //active right now
                            moon_activity = 7;
                        }
                    }
*/
                    // some validity checks and removal of invalid data
                    if (planet_activity > 60 || planet_activity < -1) {
                        planet_activity = -1;
                    }
                    if (moon_activity > 60 || moon_activity < -1) {
                        moon_activity = -1;
                    }

                } catch (no_error) {
                    //nothing to do
                }

                // moonsize
                try {
					if (rows[i].querySelector(".cellMoon > a > div") !== null){
						moonsize = parseInt(rows[i].querySelector("#moonsize").innerText.replace(/\D/g, ""));
					}
                } catch (error) {
                    // nothing to do
                }

                // debris
				if (rows[i].querySelector(".galaxy-debris > .galaxy-debris-text") !== null) {
					tmp = this.get_debris(rows[i].querySelector(".galaxy-debris > .galaxy-debris-text").innerHTML.trim());
					metal_debris = tmp[0];
					crystal_debris = tmp[1];
				}

                // playername + id + rank
                try {
					//Player ID
					tmp = rows[i].querySelector(".galaxy-player > a > span").getAttribute("playerid");
					playerid = parseInt(tmp);
					/*
					if (rows[i].querySelector("div.galaxyCell.cellAction > a.sendMail.js_openChat.tooltip") !== null) {
						tmp = rows[i].querySelector(".galaxy-player > a > span").getAttribute("data-playerid");
						playerid = parseInt(tmp);
					} else if(rows[i].querySelector(".cellPlayerName > span:not(.honorRank)").hasAttribute("rel")) {
						tmp = rows[i].querySelector(".cellPlayerName > span:not(.honorRank)").getAttribute("rel").trim(); // rel="#player100446"
						tmp = tmp.replace(/\D/g, "");
						playerid = parseInt(tmp);
					}else{
						playerid = galaxytoolbar.GTPlugin_general.get_player_id(docroot);
					}
					*/
					//Player Name
					playername = rows[i].querySelector(".galaxy-player > a > span.galaxy-username").innerText.trim();
					tmp = rows[i].querySelector(".galaxy-player > a").getAttribute("data-tooltip-content");
					player_rank = tmp.match(/start=(\d+)/)?.[1];
					//playe Status
					tmp = rows[i].querySelector(".galaxy-player > a > span.galaxy-username").getAttribute("class");
					if (tmp.indexOf("inactive") > -1) {
								playerstatus += "i";
								planet_activity = -1;
								moon_activity = -1;
							}
					/*
					//Player Rank
					if (rows[i].querySelector(".cellPlayerName > span:not(.honorRank)").classList.contains("ownPlayerRow")) {
						// own player
						player_rank = galaxytoolbar.GTPlugin_general.get_player_rank(docroot);
					} else {
						player_rank = parseInt(docroot.querySelector("#player" + playerid + " > ul > li.rank > a").innerText);
					}
					*/
					//Player Status
					if(rows[i].querySelector(".cellPlayerName > pre")){
						tmp = rows[i].querySelector(".cellPlayerName > pre").children;
						var className;
						for (var j = 0; j < tmp.length; j += 2) {
							className = tmp[j].getAttribute("class");
							if (className.indexOf("vacation") > -1) {
								playerstatus += "v";
							} else

							if (className.indexOf("longinactive") > -1) {
								playerstatus += "iI";
								planet_activity = -1;
								moon_activity = -1;
							} else
							if (className.indexOf("inactive") > -1) {
								playerstatus += "i";
								planet_activity = -1;
								moon_activity = -1;
							} else

							if (className.indexOf("banned") > -1) {
								playerstatus += "b";
								planet_activity = -1;
								moon_activity = -1;
							} else

							if (className.indexOf("strong") > -1) {
								playerstatus += "s";
							} else
							if (className.indexOf("noob") > -1) {
								playerstatus += "n";
							} else
							if (className.indexOf("outlaw") > -1) {
								playerstatus += "o";
							} else

							if (className.indexOf("admin") > -1) {
								playerstatus += "A";
							}
							/* don't send this
							if (className.indexOf("honorableTarget") > -1) {
								playerstatus += "hp";
							}*/
						}
					}

					// ally tag + id + rank + member
					var elemento = rows[i].querySelector(".galaxy-player > a[allyid]");
					if (elemento!== null){
						alliance_id = elemento.getAttribute("allyid");
						var tmp = elemento.getAttribute("data-tooltip-content");
						alliance =  tmp.match(/<th>(.*?)<\/th>/)?.[1]?.trim() || "";
						alliance = rows[i].querySelector(".galaxy-player > a > span.galaxy-alliance").innerHTML.trim().replace("[","").replace("]","");
						alliance_member = Number(tmp.match(/<td>(\d+)\s*miembros?<\/td>/)?.[1] || 0);
						//alliance_id = Number(html.match(/id=(\d+)/)?.[1] || 0);
						alliance_rank = Number(tmp.match(/who=(\d+)/)?.[1] || 0);
					}

                } catch (error) {
                    // no player
                }

                // some validity checks
                // destroyed planet = planetname only + playerid = 99999
                if ((playername == "" && moonsize > 0 && playerid != 99999) ||
                    (playername == "" && playerid > 0 && playerid != 99999) ||
                    (playername == "" && alliance != "") ||
                    (playername == "" && alliance_member > 0) ||
                    (playername == "" && alliance_rank > 0) ||
                    // don't send playerid = 0
                    (playerid == 0)) {
                    /* ||
                    (planetname == "" && moonsize > 0) ||
                    (planetname == "" && playerid > 0) ||
                    (planetname == "" && playerstatus != "") ||
                    (planetname == "" && alliance != "") ||
                    (planetname == "" && alliance_member > 0) ||
                    (planetname == "" && alliance_rank > 0)) {
                    */

                    galaxytoolbar.GTPlugin_general.set_status(docroot, "galaxyplugin" + 1, 0, "Inconsistent data found \n" +
                        "(other extensions may change\n" +
                        "ogame source code so that no\n" +
                        "data can be found or there\n" +
                        "is a bug in OGame):\n" +
                        "position: '" + position + "'\n" +
                        "planetname: '" + planetname + "'\n" +
                        "moonsize: '" + moonsize + "'\n" +
                        "playername: '" + playername + "'\n" +
                        "playerid: '" + playerid + "'\n" +
                        "playerstatus: '" + playerstatus + "'\n" +
                        "alliance: '" + alliance + "'\n" +
                        "alliance member: '" + alliance_member + "'\n" +
                        "alliance rank: '" + alliance_rank + "'\n", "All Galaxytools", true, '');

                    // inconsistent data
                    return false;
                }

                // create new output
                if (galaxy_xml == "") {
                    galaxy_xml += '\t<galaxyview galaxy="' + pos[0] + '" system="' + pos[1] + '">\n';
                }
                //create xml for the current position
                //complete entry (empty postion is created in the beginning)
                //playerid = 99999 seems to be a placeholder at ogame, nevertheless check if playername is empty, too
                if (planetname.indexOf('&') > -1) planetname = galaxytoolbar.GTPlugin_messages.htmlDecode(planetname);
                if (playername == "" && playerid == 99999) {
                    if (metal_debris > 0 || crystal_debris > 0) {
                        galaxy_xml += '\t\t<position pos="' + position + '">\n';
                        galaxy_xml += '\t\t\t<debris metal="' + metal_debris + '" crystal="' + crystal_debris + '"/>\n';
                        galaxy_xml += '\t\t</position>\n';
                    } else {
                        galaxy_xml += '\t\t<position pos="' + position + '"/>\n';
                    }
                } else if (playername != "") {
                    galaxy_xml += '\t\t<position pos="' + position + '">\n';
                    if (planetname != "") {
                        galaxy_xml += '\t\t\t<planetname>' + planetname + '</planetname>\n';
                    }
                    if (moonsize != 0) {
                        galaxy_xml += '\t\t\t<moon size="' + moonsize + '"/>\n';
                    }
                    if (metal_debris > 0 || crystal_debris > 0) {
                        galaxy_xml += '\t\t\t<debris metal="' + metal_debris + '" crystal="' + crystal_debris + '"/>\n';
                    }
                    if (playername != "") {
                        galaxy_xml += '\t\t\t<player playername="' + playername + '" rank="' + player_rank + '" playerid="' + playerid + '"';
                        if (playerstatus != "") {
                            galaxy_xml += ' status="' + playerstatus + '"';
                        }
                        galaxy_xml += '/>\n';
                    }
                    if (alliance != "") {
                        galaxy_xml += '\t\t\t<alliance allyname="';
                        galaxy_xml += alliance.indexOf('&') > -1 ? alliance.replace(/&nbsp;/g, " ") : alliance;
                        galaxy_xml += '" allyid="' + alliance_id + '" rank="' + alliance_rank + '" member="' + alliance_member + '"/>\n';
                    }
                    // Activity
                    if (planet_activity > -1 && moon_activity > -1) {
                        //  always send the lower activity first
                        if (planet_activity <= moon_activity) {
                            if (!galaxytoolbar.GTPlugin_storage.caused_activity_self(url, pos[0], pos[1], position, planet_activity) && ogame_servertime != "Invalid Date" && ogame_servertime != false) {
                                tmp = this.getActivityTime(ogame_servertime, planet_activity);
                                galaxy_xml += '\t\t\t<activity year="' + tmp[0] + '" month="' + tmp[1] +
                                    '" day="' + tmp[2] + '" hour="' + tmp[3] + '" minute="' + tmp[4] +
                                    '" weekday="' + tmp[5] + '"/>\n';
                            }
                            if (!galaxytoolbar.GTPlugin_storage.caused_activity_self(url, pos[0], pos[1], position, moon_activity) && ogame_servertime != "Invalid Date" && ogame_servertime != false) {
                                tmp = this.getActivityTime(ogame_servertime, moon_activity);
                                galaxy_xml += '\t\t\t<activity year="' + tmp[0] + '" month="' + tmp[1] +
                                    '" day="' + tmp[2] + '" hour="' + tmp[3] + '" minute="' + tmp[4] +
                                    '" weekday="' + tmp[5] + '"/>\n';
                            }
                        } else {
                            // otherwise round
                            if (!galaxytoolbar.GTPlugin_storage.caused_activity_self(url, pos[0], pos[1], position, moon_activity) && ogame_servertime != "Invalid Date" && ogame_servertime != false) {
                                tmp = this.getActivityTime(ogame_servertime, moon_activity);
                                galaxy_xml += '\t\t\t<activity year="' + tmp[0] + '" month="' + tmp[1] +
                                    '" day="' + tmp[2] + '" hour="' + tmp[3] + '" minute="' + tmp[4] +
                                    '" weekday="' + tmp[5] + '"/>\n';
                            }
                            if (!galaxytoolbar.GTPlugin_storage.caused_activity_self(url, pos[0], pos[1], position, planet_activity) && ogame_servertime != "Invalid Date" && ogame_servertime != false) {
                                tmp = this.getActivityTime(ogame_servertime, planet_activity);
                                galaxy_xml += '\t\t\t<activity year="' + tmp[0] + '" month="' + tmp[1] +
                                    '" day="' + tmp[2] + '" hour="' + tmp[3] + '" minute="' + tmp[4] +
                                    '" weekday="' + tmp[5] + '"/>\n';
                            }
                        }
                    } else if (planet_activity > -1) {
                        if (!galaxytoolbar.GTPlugin_storage.caused_activity_self(url, pos[0], pos[1], position, planet_activity) && ogame_servertime != "Invalid Date" && ogame_servertime != false) {
                            tmp = this.getActivityTime(ogame_servertime, planet_activity);
                            galaxy_xml += '\t\t\t<activity year="' + tmp[0] + '" month="' + tmp[1] +
                                '" day="' + tmp[2] + '" hour="' + tmp[3] + '" minute="' + tmp[4] +
                                '" weekday="' + tmp[5] + '"/>\n';
                        }
                    } else if (moon_activity > -1) {
                        if (!galaxytoolbar.GTPlugin_storage.caused_activity_self(url, pos[0], pos[1], position, moon_activity) && ogame_servertime != "Invalid Date" && ogame_servertime != false) {
                            tmp = this.getActivityTime(ogame_servertime, moon_activity);
                            galaxy_xml += '\t\t\t<activity year="' + tmp[0] + '" month="' + tmp[1] +
                                '" day="' + tmp[2] + '" hour="' + tmp[3] + '" minute="' + tmp[4] +
                                '" weekday="' + tmp[5] + '"/>\n';
                        }
                    }

                    galaxy_xml += '\t\t</position>\n';
                } else {
                    galaxy_xml += '\t\t<position pos="' + position + '"/>\n';
                }
            }

            galaxy_xml += '\t</galaxyview>\n';

            return galaxy_xml;
        } catch (error) {
            // unexpected error
            galaxytoolbar.GTPlugin_general.set_status(docroot, "galaxyplugin" + 1, 0, "Unexpected error: " + error, "All Galaxytools");
            return false;
        }
    },

    getGalaxySystem: function(docroot) {
        // get information about what galaxy/system selected
        try {

            var coords;

            if (docroot.getElementsByClassName("planetMoveDefault").length > 0) {
                var onclickvar = docroot.getElementsByClassName("planetMoveDefault")[0].getAttribute("onclick");
                coords = onclickvar.match(/galaxy\=(\d+)&system\=(\d+)/);
                return [parseInt(coords[1]), parseInt(coords[2])];
            }


            var colonize = docroot.getElementsByClassName("colonize-active");
            for (var i = 0; i < colonize.length; i++) {
                var href = colonize[i].getAttribute("href");
                if (href.indexOf('#') == 0) continue;
                coords = href.match(/galaxy\=(\d+)&system\=(\d+)/);
                return [parseInt(coords[1]), parseInt(coords[2])];
            }

            var galaxy = parseInt(docroot.getElementsByName("galaxy")[0].value);
            if (isNaN(galaxy)) {
                return -1;
            }

            var system = parseInt(docroot.getElementsByName("system")[0].value);
            if (isNaN(system)) {
                return -1;
            }

            return [galaxy, system];
        } catch (e) {
            //alert("error ocurred while parsing galaxy/system number:"+e);
            galaxytoolbar.GTPlugin_general.set_status(docroot, "galaxyplugin" + 1, 0, galaxytoolbar.GTPlugin_general.getLocString("error.gvnotupdated") + e, "All Galaxytools");
            return -1;
        }
    },

	get_debris: function(texto) {
        var metal_debris = 0;
        var crystal_debris = 0;
		texto = texto.replace(/&nbsp;/gi, " ");
		if (!texto || texto.trim() === "") return [0, 0]; // caso vacío
		
		const partes = texto.split(" / ");
		const convertir = str => {
			str = str.trim().replace(",", ".").toUpperCase(); // normaliza a mayúsculas
			let multiplicador = 1;

			if (str.endsWith("K")) {
				multiplicador = 1000;
				str = str.slice(0, -1);
			} else if (str.endsWith("M")) {
				multiplicador = 1000000;
				str = str.slice(0, -1);
			}

			return Number(str) * multiplicador;
		};

		metal_debris = convertir(partes[0]);
		crystal_debris = convertir(partes[1]);

		return [metal_debris, crystal_debris];
	},

    getActivityTime: function(ogametime, minutes) {
        var date_activity = new Date(ogametime.getTime() - minutes * 60000);
        var year = date_activity.getFullYear();
        var month = date_activity.getMonth() + 1; // 0 = January
        var day = date_activity.getDate();
        var hour = date_activity.getHours();
        var minute = date_activity.getMinutes();
        var weekday = date_activity.getDay();

        return [year, month, day, hour, minute, weekday];
    },

    addEspionageActionListener: function(docroot) {
        try {
            var MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

            if (MutationObserver) {
                var observer = new MutationObserver(function(mutations) {
                    mutations.forEach(function(mutation) {
                        var lastevent = mutation.addedNodes[0];
                        if (lastevent.getAttribute("class") == "success") {
                            var tmp = lastevent.innerHTML.match(/\d+:\d+:\d+/)[0].split(':');
                            var url = docroot.location.host;
                            galaxytoolbar.GTPlugin_storage.insert_espionage_action(url, parseInt(tmp[0]), parseInt(tmp[1]), parseInt(tmp[2]));
                        }
                    });
                });
                observer.observe(docroot.getElementById("fleetstatusrow"), {
                    childList: true
                });
            } else {
                // backward compatibility
                docroot.getElementById("fleetstatusrow").addEventListener("DOMNodeInserted", function(e) {
                    var lastevent = docroot.getElementById("fleetstatusrow").getElementsByTagName("div")[0];
                    if (lastevent.getAttribute("class") == "success") {
                        var tmp = lastevent.innerHTML.match(/\d+:\d+:\d+/)[0].split(':');
                        var url = docroot.location.host;
                        galaxytoolbar.GTPlugin_storage.insert_espionage_action(url, parseInt(tmp[0]), parseInt(tmp[1]), parseInt(tmp[2]));
                    }
                }, false);
            }
        } catch (e) {
            // alert(e);
        }
    },

    submit_galaxydata: function(doc) {
        // reset status window content from any previous transmission
        try {
            galaxytoolbar.GTPlugin_general.clear_status(doc);
        } catch (e) {
            //alert("error: "+e);
        }

        var pos = this.getGalaxySystem(doc);
        galaxytoolbar.GTPlugin_general.set_status(doc, "galaxyplugin" + 1, 0, galaxytoolbar.GTPlugin_general.getLocString("galaxyfound.prefix") + pos[0] + ":" + pos[1] + galaxytoolbar.GTPlugin_general.getLocString("galaxyfound.suffix"), "All Galaxytools");
        var tmp = this.get_galaxyview_data(doc, pos);

        if (tmp != false) galaxytoolbar.GTPlugin_general.send(doc, "galaxy", tmp, doc.URL, pos);
    },

    submit_galaxydata_mutation_handler: function(mutations, doc) {
        mutations.forEach(function(mutation) {
            var nodes = mutation.addedNodes;
            for (var i = 0; i < nodes.length; i++) {
                if (nodes[i].nodeType == 1) {
                    if (nodes[i].classList.contains("planetMoveDefault") || nodes[i].tagName == "SPAN") {
                        galaxytoolbar.GTPlugin_galaxyview.submit_galaxydata(doc);
                    }
                }
            }
        });
    }
};