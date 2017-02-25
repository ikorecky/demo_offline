(function ($) {
    var App = kendo.Observable.extend({
        init: function () {
            var that = this;

            kendo.Observable.fn.init.call(that);

            document.addEventListener('deviceready', function () {
                that.mobileApp = new kendo.mobile.Application(document.body, {
                    transition: "slide",
                    skin: "flat",
                    initial: "views/loginView.html",
                    layout: "default",
                    statusBarStyle: 'black-translucent'
                });
            }, false);

            that.viewModels = {};
            that.dataSources = {};
            that.username = null;
            that.password = null;
        },

        onShow: function () {
            var that = this;

            that._addOnlineOfflineListeners();

            if (navigator && navigator.splashscreen) {
                navigator.splashscreen.hide();
            }
        },

        login: function (username, password) {
            var that = this, deferred = $.Deferred();

            if (!that.jsdoSession) {
                that.jsdoSession = new progress.data.JSDOSession(jsdoSettings);
            }

            if (that.isOnline()) {
                that._connect(username, password)
                    .done(function () {
                        that.username = username;
                        that.password = password;

                        localStorage.setItem("username", that.username);
                        localStorage.setItem("password", that._hashCode(that.password).toString());

                        deferred.resolve();
                    })
                    .fail(function () {
                        deferred.reject();
                    });
            }
            else {
                if ((localStorage.getItem("password") || "") === "") {
                    navigator.notification.alert("Logout from previous session. Cannot continue previous session.");
                    deferred.reject();
                }
                else
                    if ((localStorage.getItem("username") || "") !== username || (localStorage.getItem("password") || "") !== that._hashCode(password).toString()) {
                        navigator.notification.alert("Invalid username or password");
                        deferred.reject();
                    }
                    else {
                        that.username = username;
                        that.password = password;

                        that._addCatalog()
                            .done(function () { deferred.resolve(); })
                            .fail(function () { deferred.reject(); });
                    }
            }

            return deferred;
        },

        logout: function () {
            var that = this, deferred = $.Deferred();

            if (!that.isOnline()) {
                navigator.notification.alert("Cannot logout and switch user offline");
                deferred.reject();
            }
            else {
                that.username = null;
                that.password = null;

                localStorage.removeItem("username");
                localStorage.removeItem("password");

                that._disconnect()
                    .done(function () {
                        that._deleteLocal();

                        // onDisconnect can only happen in logout or on offline event.
                        // _disconnect cannot be called externally only from the logout or _connect
                        // which should not be called from _disconnect as part of the connect process.
                        that.onDisconnect();
                        deferred.resolve();
                    })
                    .fail(function () { deferred.reject(); });
            }

            return deferred;
        },

        // device.isVirtual does not exist in this version of the cordova device plugin
        isVirtual: function () {
            return (navigator.appVersion.toLowerCase().indexOf("windows") >= 0);
        },

        isConnected: function () {
            var that = this;

            return (that.isOnline() && that.jsdoSession && that.jsdoSession.connected);
        },

        isOnline: function () {
            var that = this;

            if (that.isVirtual()) {
                return true;
            }
            else if (!navigator || !navigator.connection) {
                return true;
            }
            else {
                return navigator.connection.type !== 'none';
            }
        },

        hasChanges: function () {
            var that = this, JSDOs = that.jsdoSession.JSDOs;

            for (var i = 0; i < JSDOs.length; i++) {
                if (JSDOs[i].hasChanges()) {
                    return true;
                }
            }

            return false;
        },

        loadDataSources: function () {
            var that = this,
                arr = that.jsdoSession.JSDOs.slice();

            if (arr.length === 0) {
                return;
            }

            doFill();

            function doFill() {
                var jsdo = arr.shift();

                jsdo.dataSource.read()
                    .always(function () {
                        if (arr.length > 0) {
                            doFill();
                        }
                    });
            }
        },

        saveChanges: function () {
            var that = this, arr = [];

            $.each(that.jsdoSession.JSDOs, function (idx, jsdo) {
                if (jsdo.hasChanges()) {
                    arr.push(jsdo);
                }
            });

            if (arr.length === 0) {
                return;
            }

            doSync();

            function doSync() {
                var jsdo = arr.shift();

                jsdo.dataSource.sync()
                    .done(function () {
                        if (arr.length > 0) {
                            doSync();
                        }
                    });
            }
        },

        _deleteLocal: function () {
            var that = this;

            $.each(that.jsdoSession.JSDOs, function (idx, jsdo) {
                jsdo.dataSource.deleteOfflineData();
            });
        },

        _connect: function (username, password) {
            var that = this, deferred = $.Deferred();

            // re-connect
            if (arguments.length === 0) {
                username = that.username;
                password = that.password;
            }

            if (!that.isOnline()) {
                navigator.notification.alert("Network not connected. Cannot login.");
                deferred.reject();
            }
            else {
                that.onConnect();

                // download catalog also used to verify connection to the server with a controlled timeout
                that._downloadCatalog()
                    .done(function () {
                        if (that._isLoggedIn) {
                            that._disconnect().always(doConnect);
                        }
                        else {
                            doConnect();
                        }
                    })
                    .fail(function () {
                        that.onConnectFail();
                        deferred.reject();
                    });
            }

            return deferred;

            function doConnect() {
                that.jsdoSession.login(that.username, that.password)
                    .done(function () {
                        that._isLoggedIn = true;
                        that._addCatalog()
                            .done(function () {
                                that.onConnectDone();
                                deferred.resolve();
                            })
                            .fail(function () {
                                that.onConnectFail();
                                deferred.reject();
                            });
                    })
                    .fail(function () {
                        that.onConnectFail();
                        navigator.notification.alert("jsdoSession.login() failed");
                        deferred.reject();
                    });
            }
        },

        _disconnect: function () {
            var that = this, deferred = $.Deferred();

            that.jsdoSession.logout()
                .done(function () {
                    that._isLoggedIn = false;
                    deferred.resolve();
                })
                .fail(function () {
                    that._isLoggedIn = false;
                    deferred.reject();
                });

            return deferred;
        },

        _downloadCatalog: function () {
            var that = this, deferred = $.Deferred(), cnt = 0;

            if (that.isVirtual()) {
                deferred.resolve();
            }
            else {
                downloadCatalog();
            }

            return deferred;

            function downloadCatalog() {
                var ft = new FileTransfer(),
                    abortTimeout = setTimeout(function () {
                        abortTimeout = null;
                        ft.abort();

                        cnt++;
                        if (cnt < 5) {
                            downloadCatalog();
                        }
                        else {
                            navigator.notification.alert("Download timedout out for " + jsdoSettings.catalogURIs);
                            deferred.reject();
                        }
                    }, 3000);

                ft.download(
                    encodeURI(jsdoSettings.catalogURIs),
                    cordova.file.tempDirectory + "/JSDOCatalog.json",
                    function () {
                        clearTimeout(abortTimeout);
                        window.resolveLocalFileSystemURL(
                            cordova.file.tempDirectory + "/JSDOCatalog.json",
                            function (fileEntry) {
                                window.resolveLocalFileSystemURL(
                                    cordova.file.dataDirectory,
                                    function (dirEntry) {
                                        fileEntry.moveTo(dirEntry, "JSDOCatalog.json",
                                            function () {
                                                deferred.resolve();
                                            },
                                            function () {
                                                navigator.notification.alert("fileEntry.moveTo() failed");
                                                deferred.reject();
                                            });
                                    },
                                    function () {
                                        navigator.notification.alert("resolveLocalFileSystemURL() failed");
                                        deferred.reject();
                                    });
                            },
                            function () {
                                navigator.notification.alert("resolveLocalFileSystemURL() failed");
                                deferred.reject();
                            });
                    },
                    function (error) {
                        // only timeout is used because fail can happen quicker 
                        // and we would like to spaceout the retries

                        /*
                        if (!abortTimeout) {
                            return;
                        }

                        clearTimeout(abortTimeout);
                        abortTimeout = null;

                        cnt++;
                        if (cnt < 3) {
                            downloadCatalog();
                        }
                        else {
                            navigator.notification.alert("Download failed for " + jsdoSettings.catalogURIs);
                            deferred.reject();
                        }
                        */
                    },

                    true
                );
            }
        },

        _addCatalog: function () {
            var that = this,
                deferred = $.Deferred(),
                fileURL = (!that.isVirtual() ? cordova.file.dataDirectory + "/JSDOCatalog.json" : jsdoSettings.catalogURIs);

            that.jsdoSession.addCatalog(fileURL)
                .done(function () {
                    deferred.resolve()
                })
                .fail(function () {
                    navigator.notification.alert("jsdoSession.addCatalog() failed");
                    deferred.reject()
                });

            return deferred;
        },

        _addOnlineOfflineListeners: function () {
            var that = this, isOnline = that.isOnline();

            that._wasOnline = isOnline;
            that._displayFooter();

            // $(window).on("online", function() {
            //     that._onOnlineOffline();
            // });

            // $(window).on("offline", function() {
            //     that._onOnlineOffline();
            // });

            document.addEventListener("online", function () {
                that._onOnlineOffline();
            });

            document.addEventListener("offline", function () {
                that._onOnlineOffline();
            });
        },

        _onOnlineOffline: function () {
            var that = this, isOnline = that.isOnline();

            if (that._wasOnline === isOnline) {
                return;
            }
            that._wasOnline = isOnline;

            if (that.username === null) {
                this._displayFooter();
            }

            else {
                if (isOnline) {
                    that._connect().done(function () {
                        that.saveChanges();
                    });
                }
                else {
                    that.onDisconnect();
                }
            }
        },

        onConnect: function () {
            var that = this;

            if (that._syncTimeout) {
                clearTimeout(that._syncTimeout);
                that._syncTimeout = null;
            }

            that._displayFooter("connect");
        },

        onConnectDone: function () {
            var that = this;

            if (that._syncTimeout) {
                clearTimeout(that._syncTimeout);
                that._syncTimeout = null;
            }

            that._syncTimeout = setTimeout(function () {
                that._syncTimeout = null;
                that._displayFooter("connect-done");
                that._syncTimeout = setTimeout(function () {
                    that._syncTimeout = null;
                    that._displayFooter();
                }, 1000);
            }, 500);

            if (that._wasConnected !== true) {
                that._wasConnected = true;
                that.trigger("online");
            }
        },

        onConnectFail: function () {
            var that = this;

            if (that._syncTimeout) {
                clearTimeout(that._syncTimeout);
                that._syncTimeout = null;
            }

            that._displayFooter("connect-fail");
            that._syncTimeout = setTimeout(function () {
                that._syncTimeout = null;
                that._displayFooter();
            }, 1000);
        },

        onDisconnect: function () {
            var that = this;

            if (that.username === null) {
                that._displayFooter();
            }
            else {
                that._displayFooter("offline");
            }

            if (that._wasConnected !== false) {
                that._wasConnected = false;
                that.trigger("offline");
            }
        },

        onSync: function () {
            var that = this;

            if (that._syncTimeout) {
                clearTimeout(that._syncTimeout);
                that._syncTimeout = null;
            }

            that._displayFooter("sync");
        },

        onSyncDone: function () {
            var that = this;

            if (that._syncTimeout) {
                clearTimeout(that._syncTimeout);
                that._syncTimeout = null;
            }

            that._syncTimeout = setTimeout(function () {
                that._syncTimeout = null;
                that._displayFooter("sync-done");
                that._syncTimeout = setTimeout(function () {
                    that._syncTimeout = null;
                    that._displayFooter();
                }, 1000);
            }, 500);
        },

        onSyncFail: function () {
            var that = this;

            if (that._syncTimeout) {
                clearTimeout(that._syncTimeout);
                that._syncTimeout = null;
            }

            that._syncTimeout = setTimeout(function () {
                that._syncTimeout = null;
                that._displayFooter("sync-fail");
                that._syncTimeout = setTimeout(function () {
                    that._syncTimeout = null;
                    that._displayFooter();
                }, 1000);
            }, 500);
        },

        _displayFooter: function (cls) {
            var that = this;

            if (cls === undefined) {
                cls = (isOnline() ? "online" : "offline");
            }

            if (!that._displayFooterEl) {
                that._displayFooterEl = $("#app-footer");
            }

            if (that._displayFooterEl.lastCls === cls) {
                return;
            }

            that._displayFooterEl.lastCls = cls;
            that._displayFooterEl.removeClass().addClass(cls);

            function isOnline() {
                if (that.username === null) {
                    return that.isOnline();
                }
                else {
                    return that.isConnected();
                }
            }
        },

        _hashCode: function (str) {
            if (str === null || str === undefined) {
                return 0;
            }
            if (typeof str !== "string") {
                str = str.toString();
            }
            return str.split("").reduce(function (a, b) { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0);
        }
    });

    app = new App();
})(jQuery);
