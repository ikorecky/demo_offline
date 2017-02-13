(function ($) {
    var isSim = false; // ** device.isVirtual not added

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
                    statusBarStyle: 'black-translucent',
                    init: function () {
                        setTimeout(function () {
                            that._addConnectionListeners();

                            if (navigator && navigator.splashscreen) {
                                navigator.splashscreen.hide();
                            }
                        }, 100);
                    }
                });
            }, false);

            that.viewModels = {};
            that.username = null;
            that.password = null;
        },

        login: function (username, password, callback) {
            callback = callback || function () { };

            var that = this;

            that.username = username;
            that.password = password;

            if (!that.jsdoSession) {
                that._createSession(doLogin);
            }
            else {
                doLogin();
            }

            function doLogin() {
                if (that.isOnline()) {
                    that._connect(function () {
                        callback();

                        localStorage.setItem("username", that.username);
                        localStorage.setItem("password", that._hashCode(that.password).toString());
                    });
                }
                else {
                    username = localStorage.getItem("username") || "";
                    password = localStorage.getItem("password") || "";
                    if (username !== that.username || password !== that._hashCode(that.password).toString()) {
                        navigator.notification.alert("Invalid username or password.");
                    }
                    else {
                        that._addCatalog(callback);
                    }
                }
            }
        },

        logout: function (callback) {
            callback = callback || function () { };

            var that = this;

            if (!that.isOnline()) {
                navigator.notification.alert("Cannot logout offline.");
                return;
            }

            that.username = null;
            that.password = null;

            localStorage.removeItem("username");
            localStorage.removeItem("password");

            that._deleteLocal();

            that._disconnect(callback);
        },

        _syncChanges: function () {
            doSync();

            function doSync() {
                $.each(app.jsdoSession.JSDOs, function (idx, jsdo) {
                    if (jsdo.hasChanges()) {
                        jsdo.offlineSaveChanges().done(function() {
                            doSync();
                        });
                        return false;
                    }
                })
            }
        },

        _deleteLocal: function () {
            $.each(app.jsdoSession.JSDOs, function (idx, jsdo) {
                jsdo.deleteLocal();
            })
        },

        isOnline: function () {
            if (isSim) {
                return true;
            }
            else if (!navigator || !navigator.connection) {
                return true;
            }
            else {
                return navigator.connection.type !== 'none';
            }
        },

        _connect: function (callback) {
            callback = callback || function () { };

            var that = this;

            if (!that.isOnline()) {
                navigator.notification.alert("Network not connected. Cannot login.");
                return;
            }

            if (that.jsdoSession && that.jsdoSession.connected) {
                that._disconnect(doConnect);
            }
            else {
                doConnect();
            }

            var cnt = 0;

            function doConnect() {
                cnt++;
                that.jsdoSession.login(that.username, that.password)
                    .done(function () {
                        that._addCatalog(function () {
                            that.isConnected = true;
                            callback();
                        });
                    })
                    .fail(function () {
                        setTimeout(function () {
                            if (cnt < 3) {
                                doConnect();
                            }
                            else {
                                navigator.notification.alert("jsdoSession.login() failed.");
                            }
                        }, 500);
                    });
            }
        },

        _disconnect: function (callback) {
            callback = callback || function () { };

            var that = this;

            that.isConnected = false;
            that.jsdoSession.logout().always(callback);
        },

        _addCatalog: function (callback) {
            callback = callback || function () { };

            var that = this,
                fileURL = (!isSim ? cordova.file.dataDirectory + "/JSDOCatalog.json" : jsdoSettings.catalogURIs);

            that.jsdoSession.addCatalog(fileURL)
                .done(callback)
                .fail(function (jsdoSession, result, details) {
                    navigator.notification.alert("jsdoSession.addCatalog() failed.");
                });
        },

        _createSession: function (callback) {
            callback = callback || function () { };

            var that = this,
                jsdoSession = new progress.data.JSDOSession(jsdoSettings);

            if (that.isOnline() && !isSim) {
                var ft = new FileTransfer(),
                    catalogURIs = jsdoSettings.catalogURIs,
                    abortTimeout = setTimeout(function () {
                        ft.abort();
                        navigator.notification.alert("File download timedout for " + catalogURIs);
                    }, 3000);

                ft.download(
                    encodeURI(catalogURIs),
                    cordova.file.dataDirectory + "/JSDOCatalog.json",
                    function () {
                        clearTimeout(abortTimeout);
                        that.jsdoSession = jsdoSession;
                        callback();
                    },

                    function (error) {
                        navigator.notification.alert("FileTransfer.download failed for " + catalogURIs);
                    },

                    true
                );
            }

            else {
                that.jsdoSession = jsdoSession;
                callback();
            }
        },

        _addConnectionListeners: function () {
            var that = this, isOnline = that.isOnline();
            that.wasOnline = isOnline;
            that._displayFooter(isOnline ? "online" : "offline");

            document.addEventListener("online", function () {
                that._onConnectionChange();
            });

            document.addEventListener("offline", function () {
                that._onConnectionChange();
            });
        },

        _onConnectionChange: function () {
            var that = this, isOnline = that.isOnline();

            if (that.wasOnline === isOnline) {
                return;
            }
            that.wasOnline = isOnline;

            if (that.username === null) {
                if (isOnline) {
                    that.trigger("online");
                    that._displayFooter("online");
                }
                else {
                    that.trigger("offline");
                    that._displayFooter("offline");
                }
            }
            else {
                if (isOnline) {
                    if (!that.isConnected) {
                        doConnect();
                    }
                    else
                        if (that.jsdoSession.connected) {
                            doConnect();
                        }
                        else {
                            var cnt = 0, id = setInterval(function () {
                                if (that.jsdoSession.connected || cnt >= 10) {
                                    doConnect();
                                    clearInterval(id);
                                }
                                cnt++;
                            }, 100);
                        }
                }
                else {
                    that.trigger("offline");
                    that._displayFooter("offline");
                }
            }

            function doConnect() {
                that._connect(function () {
                    that.trigger("online");
                    that._displayFooter("online");

                    that._syncChanges();
                });
            }
        },

        _displayFooter: function (cls) {
            var that = this;

            if (!that._displayFooterEl) {
                that._displayFooterEl = $("#app-footer");
            }

            that._displayFooterEl.removeClass().addClass(cls);
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
