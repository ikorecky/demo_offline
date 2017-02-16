(function ($) {
    // device.isVirtual does not exist in this version of the cordova device plugin
    var isSim = false;

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
            that.username = null;
            that.password = null;
        },

        onShow: function () {
            var that = this;

            console.log(device.model);
            that._addOnlineOfflineListeners();

            if (navigator && navigator.splashscreen) {
                navigator.splashscreen.hide();
            }
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
                        navigator.notification.alert("Invalid username or password");
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
                navigator.notification.alert("Cannot logout offline");
                return;
            }

            that.username = null;
            that.password = null;

            localStorage.removeItem("username");
            localStorage.removeItem("password");

            that._deleteLocal();
            that._disconnect(callback);
        },

        isConnected: function () {
            var that = this;

            return (that.isOnline() && that.jsdoSession && that.jsdoSession.connected);
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

        _syncChanges: function () {
            var that = this, arr = [];

            $.each(that.jsdoSession.JSDOs, function (idx, jsdo) {
                if (jsdo.hasChanges()) {
                    arr.push(jsdo);
                }
            });

            if (arr.length === 0) {
                return;
            }

            that._onSync();
            doSync();

            function doSync() {
                var jsdo = arr.shift();

                jsdo.saveChanges()
                    .done(function (jsdo, success, request) {
                        jsdo.saveLocal(jsdo.name);
                        if (arr.length === 0) {
                            app._onSyncDone();
                        }
                        else {
                            doSync();
                        }
                    })
                    .fail(function (jsdo, success, request) {
                        app._onSyncFail();
                    });
            }
        },

        _deleteLocal: function () {
            var that = this;

            $.each(that.jsdoSession.JSDOs, function (idx, jsdo) {
                jsdo.deleteLocal();
            })
        },

        _onSync: function () {
            var that = this;

            that._displayFooter("sync");
        },

        _onSyncDone: function () {
            var that = this;

            setTimeout(function () {
                that._displayFooter("sync-done");
                setTimeout(function () {
                    that._displayFooter();
                }, 1000);
            }, 500);
        },

        _onSyncFail: function () {
            var that = this;

            setTimeout(function () {
                that._displayFooter("sync-fail");
                setTimeout(function () {
                    that._displayFooter();
                }, 1000);
            }, 500);
        },

        _connect: function (callback) {
            callback = callback || function () { };

            var that = this;

            if (!that.isOnline()) {
                navigator.notification.alert("Network not connected. Cannot login.");
                return;
            }

            if (that.isConnected()) {
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
                        that._addCatalog(callback);
                    })
                    .fail(function () {
                        setTimeout(function () {
                            if (cnt < 3) {
                                doConnect();
                            }
                            else {
                                navigator.notification.alert("jsdoSession.login() failed");
                            }
                        }, 500);
                    });
            }
        },

        _disconnect: function (callback) {
            callback = callback || function () { };

            var that = this;

            that.jsdoSession.logout().always(function () {
                callback();
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
                        navigator.notification.alert("File download timed out for " + catalogURIs);
                    }, 3000);

                ft.download(
                    encodeURI(catalogURIs),
                    cordova.file.dataDirectory + "/JSDOCatalog.json",
                    function () {
                        clearTimeout(abortTimeout);

                        doSuccess();
                    },

                    function (error) {
                        navigator.notification.alert("FileTransfer.download failed for " + catalogURIs);
                    },

                    true
                );
            }

            else {
                doSuccess();
            }

            function doSuccess() {
                that.jsdoSession = jsdoSession;
                that._addConnectionListeners();
                callback();
            }
        },

        _addCatalog: function (callback) {
            callback = callback || function () { };

            var that = this,
                fileURL = (!isSim ? cordova.file.dataDirectory + "/JSDOCatalog.json" : jsdoSettings.catalogURIs);

            that.jsdoSession.addCatalog(fileURL)
                .done(callback)
                .fail(function (jsdoSession, result, details) {
                    navigator.notification.alert("jsdoSession.addCatalog() failed");
                });
        },

        _addConnectionListeners: function () {
            var that = this, isConnected = that.isConnected();

            that._wasConnected = isConnected;

            that.jsdoSession.subscribe('online', function () {
                that._onConnectionChange();
            });
            that.jsdoSession.subscribe('offline', function () {
                that._onConnectionChange();
            });
        },

        _onConnectionChange: function () {
            var that = this, isConnected = that.isConnected();

            if (that._wasConnected === isConnected) {
                return;
            }
            that._wasConnected = isConnected;

            if (isConnected) {
                that._syncChanges();
            }
        },

        _addOnlineOfflineListeners: function () {
            var that = this, isOnline = that.isOnline();

            that._wasOnline = isOnline;
            that._displayFooter();

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

            this._displayFooter();

            if (isOnline) {
                that._connect();
            }
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
