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

        login: function (username, password, callback) {
            var that = this;

            callback = callback || function () { };

            if (!that.jsdoSession) {
                that.jsdoSession = new progress.data.JSDOSession(jsdoSettings);
            }

            if (that.isOnline()) {
                that._connect(username, password, function () {
                    doSuccess();

                    callback();
                });
            }
            else {
                if ((localStorage.getItem("username") || "") !== username
                    || (localStorage.getItem("password") || "") !== that._hashCode(password).toString()) {
                    navigator.notification.alert("Invalid username or password");
                }
                else {
                    doSuccess();

                    that._addCatalog(callback);
                }
            }
            function doSuccess() {
                that.username = username;
                that.password = password;

                localStorage.setItem("username", that.username);
                localStorage.setItem("password", that._hashCode(that.password).toString());
            }
        },

        logout: function (callback) {
            var that = this;

            callback = callback || function () { };

            if (!that.isOnline()) {
                navigator.notification.alert("Cannot logout offline");
                return;
            }

            that.username = null;
            that.password = null;

            that._disconnect(callback);
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
                    .done(function () {
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

                jsdo.offlineSaveChanges()
                    .done(function () {
                        if (arr.length > 0) {
                            doSync();
                        }
                    });
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
                that._displayFooter("sync-done");
                that._syncTimeout = setTimeout(function () {
                    that._syncTimeout = null;
                    that._displayFooter();
                }, 1000);
            }, 500);
        },

        _connect: function (username, password, callback) {
            var that = this;

            // re-connect
            if (arguments.length === 1) {
                callback = username;
                username = that.username;
                password = that.password;
            }

            callback = callback || function () { };

            if (!that.isOnline()) {
                navigator.notification.alert("Network not connected. Cannot login.");
                return;
            }

            // also used to verify connection to the server with a controlled timeout
            that._downloadCatalog(function () {
                if (that._isLoggedIn) {
                    that._disconnect(doConnect);
                }
                else {
                    doConnect();
                }
            });

            function doConnect() {
                that.jsdoSession.login(that.username, that.password)
                    .done(function () {
                        that._isLoggedIn = true;
                        that._addCatalog(function () {
                            that._displayFooter("online");
                            that.trigger("online");
                            callback()
                        });
                    })
                    .fail(function () {
                        navigator.notification.alert("jsdoSession.login() failed");
                    });
            }
        },

        _disconnect: function (callback) {
            var that = this;

            callback = callback || function () { };

            that.jsdoSession.logout().always(function () {
                that._isLoggedIn = false;
                callback();
            });
        },

        _downloadCatalog: function (callback) {
            var that = this;

            callback = callback || function () { };

            if (that.isVirtual()) {
                callback();
                return;
            }

            var cnt = 0;

            downloadFile(
                jsdoSettings.catalogURIs,
                cordova.file.tempDirectory + "/JSDOCatalog.json",
                function () {
                    moveFile(
                        cordova.file.tempDirectory, "JSDOCatalog.json",
                        cordova.file.dataDirectory, "JSDOCatalog.json",
                        callback);
                }
            );

            function downloadFile(sourcefile, targetfile, callback) {
                var ft = new FileTransfer(),
                    abortTimeout = setTimeout(function () {
                        ft.abort();
                        fail();
                    }, 3000);

                ft.download(
                    encodeURI(sourcefile),
                    targetfile,
                    function () {
                        clearTimeout(abortTimeout);
                        callback();
                    },

                    function (error) {
                        clearTimeout(abortTimeout);

                        cnt++;
                        if (cnt < 3) {
                            downloadFile(sourcefile, targetfile, callback);
                        }
                        else {
                            navigator.notification.alert("Download timedout for " + sourcefile);
                        }
                    },

                    true
                );
            }

            function moveFile(olddir, oldname, newdir, newname, callback) {
                window.resolveLocalFileSystemURL(
                    olddir + "/" + oldname,
                    function (fileEntry) {
                        window.resolveLocalFileSystemURL(newdir,
                            function (dirEntry) {
                                fileEntry.moveTo(dirEntry, newname,
                                    callback,
                                    function () {
                                        navigator.notification.alert("fileEntry.moveTo() failed");
                                    });
                            },
                            function () {
                                navigator.notification.alert("resolveLocalFileSystemURL() failed for " + newdir);
                            });
                    },
                    function () {
                        navigator.notification.alert("resolveLocalFileSystemURL() failed for " + olddir + "/" + oldname);
                    });
            }
        },

        _addCatalog: function (callback) {
            var that = this,
                fileURL = (!that.isVirtual() ? cordova.file.dataDirectory + "/JSDOCatalog.json" : jsdoSettings.catalogURIs);

            callback = callback || function () { };

            that.jsdoSession.addCatalog(fileURL)
                .done(callback)
                .fail(function (jsdoSession, result, details) {
                    navigator.notification.alert("jsdoSession.addCatalog() failed");
                });
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

            if (that.username === null) {
                this._displayFooter();
            }

            else {
                if (isOnline) {
                    that._connect(function () {
                        that.saveChanges();
                    });
                }
                else {
                    that._displayFooter("offline");
                    that.trigger("offline");
                }
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
