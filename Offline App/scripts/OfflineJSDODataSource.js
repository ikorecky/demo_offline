(function () {
    OfflineJSDODataSource = kendo.data.DataSource.extend({
        init: function (opts) {
            opts = opts || {};

            var that = this, idField;

            $.each(progress.data.ServicesManager.getResource(opts.name).schema.properties, function (name, ds) {
                $.each(ds.properties, function (name, tt) {
                    idField = tt.primaryKey[0];
                    return false;
                });
                return false;
            });

            var jsdo = new progress.data.JSDO({
                name: opts.name,
                autoFill: false
            });

            delete opts.name;

            opts = $.extend(true, {
                batch: true,
                transport: {
                    read: function (opts) {
                        that.offlineRead(opts);
                    },

                    update: function (opts) {
                        that.offlineUpdate(opts);
                    },

                    create: function (opts) {
                        opts.success();
                    },

                    destroy: function (opts) {
                        opts.success();
                    }
                },
                schema: {
                    model: {
                        id: idField
                    }
                }
            }, opts);

            kendo.data.DataSource.fn.init.call(that, opts);

            that.jsdo = jsdo;
        },

        offlineRead: function (opts) {
            var that = this, jsdo = that.jsdo;

            if (app.isConnected()) {
                jsdo.readLocal(jsdo.name);
                if (jsdo.hasChanges()) {
                    jsdo.saveChanges().done(doFill);
                }
                else {
                    doFill();
                }
            }
            else {
                jsdo.readLocal(jsdo.name);
                opts.success(jsdo.getData());
            }

            function doFill() {
                jsdo.fill()
                    .done(function (jsdo, success, request) {
                        jsdo.saveLocal(jsdo.name);
                        opts.success(jsdo.getData());
                    })
                    .fail(function () {
                        opts.error("jsdo.fill() failed");
                    });
            }
        },

        offlineUpdate: function (opts) {
            var that = this, jsdo = that.jsdo;

            $.each(opts.data.models, function (idx, data) {
                var rec = jsdo.findById(data._id);
                rec.assign(data);
            });

            if (app.isConnected()) {
                app._onSync();

                jsdo.saveChanges()
                    .done(function (jsdo, success, request) {
                        jsdo.saveLocal(jsdo.name);
                        app._onSyncDone();
                        opts.success();
                    })
                    .fail(function (jsdo, success, request) {
                        app._onSyncFail();
                        opts.error("jsdo.saveChanges() failed");
                    });
            }
            else {
                jsdo.saveLocal(jsdo.name);
                opts.success();
            }
        }
    });
})();