(function ($) {
    app.viewModels.employeeViewModel = new kendo.data.ObservableObject({
        onInitList: function () {
            var that = this;

            that.model.set("dataSource", app.dataSources.employeeDataSource);
        },

        onClickListItem: function (e) {
            app.mobileApp.navigate("views/employeeDetailView.html?uid=" + e.dataItem.uid);
        },

        onShowDetail: function (e) {
            var that = this,
                item = that.model.dataSource.getByUid(e.view.params.uid);

            that.model.set("currentItem", item);
            that.model.set("isEdit", (e.view.params.isEdit === "true" ? true : false));
        },

        onEdit: function () {
            var that = this;

            that.set("isEdit", true);
        },

        onSave: function () {
            var that = this;

            if (that.dataSource.hasChanges()) {
                that.dataSource.sync();
                app.mobileApp.navigate("#:back");
            }
            else {
                that.set("isEdit", false);
            }
        },

        onDelete: function () {
            var that = this;

            navigator.notification.confirm(
                "Delete employee?",
                function (idx) {
                    switch (idx) {
                        case 1:
                            that.dataSource.remove(that.currentItem);
                            that.dataSource.sync();

                            app.mobileApp.navigate("#:back");
                            break;
                    }
                },
                "Confirm",
                ["OK", "Cancel"]
            );
        },

        onCreate: function () {
            var that = this,
                item = that.dataSource.add({
                    FirstName: "",
                    LastName: "",
                    Address: "",
                    City: "",
                    State: "",
                    HomePhone: ""
                });

            app.mobileApp.navigate("views/employeeDetailView.html?uid=" + item.uid + "&isEdit=true");
        },

        onCancel: function () {
            var that = this;

            if (that.dataSource.hasChanges()) {
                navigator.notification.confirm(
                    "Cancel changes?",
                    function (idx) {
                        switch (idx) {
                            case 1:
                                that.dataSource.cancelChanges();
                                app.mobileApp.navigate("#:back");
                                break;
                        }
                    },
                    "Confirm",
                    ["OK", "Cancel"]
                );
            }
            else {
                app.mobileApp.navigate("#:back");
            }
        }
    });
})(jQuery);
