(function () {
    OfflineJSDO = function (opts) {
        opts = opts || {};

        if (opts.auotFill === undefined) {
            opts.autoFill = false;
        }

        var that = this, dataSource = {};

        if (opts.dataSource) {
            dataSource = opts.dataSource;
            delete opts.dataSource;
        }

        progress.data.JSDO.call(that, opts);

        var idField = null;

        $.each(progress.data.ServicesManager.getResource(that.name).schema.properties, function (name, ds) {
            $.each(ds.properties, function (name, tt) {
                idField = tt.primaryKey[0];
                return false;
            })
            return false;
        });

        dataSource = $.extend(true, {
            batch: true,
            transport: {
                read: function (e) {
                    that.offlineFill().done(function (jsdo) {
                        e.success(jsdo.getData());
                    });
                },

                update: function (e) {
                    $.each(e.data.models, function (idx, data) {
                        var rec = that.findById(data._id);
                        rec.assign(data);
                    });
                    that.offlineSaveChanges().done(function () {
                        e.success();
                    });
                },

                create: function (e) {
                    e.success();
                },

                destroy: function (e) {
                    e.success();
                }
            },
            schema: {
                model: {
                    id: idField
                }
            }
        }, dataSource);

        that.dataSource = new kendo.data.DataSource(dataSource);
    };

    OfflineJSDO.prototype = {
        constructor: OfflineJSDO,

        offlineFill: function (e) {
            var that = this, deferred = $.Deferred();

            if (app.jsdoSession.connected) {
                that.readLocal(that.name);
                if (that.hasChanges()) {
                    that.offlineSaveChanges().done(doFill());
                }
                else {
                    doFill();
                }
            }
            else {
                that.readLocal(that.name);
                deferred.resolve(that, true, null);
            }

            return deferred.promise();

            function doFill() {
                that.fill(e)
                    .done(function (jsdo, success, request) {
                        that.saveLocal(that.name);
                        deferred.resolve(jsdo, success, request);
                    })
                    .fail(function (jsdo, success, request) {
                        deferred.reject(jsdo, success, request);
                    });
            }
        },

        offlineSaveChanges: function (submit) {
            var that = this, deferred = $.Deferred();

            if (app.jsdoSession.connected) {
                app._displayFooter("sync");

                that.saveChanges()
                    .done(function (jsdo, success, request) {
                        afterSave();
                        deferred.resolve(jsdo, success, request);
                    })
                    .fail(function (jsdo, success, request) {
                        afterSave();
                        deferred.reject(jsdo, success, request);
                    });
            }
            else {
                that.saveLocal(that.name);
                deferred.resolve(that, true, null);
            }

            return deferred.promise();

            function afterSave() {
                that.saveLocal(that.name);
                setTimeout(function () {
                    app._displayFooter("sync-done");
                    setTimeout(function () {
                        app._displayFooter(app.jsdoSession.connected ? "online" : "offline");
                    }, 1000);
                }, 300);
            }
        }
    };

    Object.setPrototypeOf(OfflineJSDO.prototype, progress.data.JSDO.prototype);
})();