(function ($) {
    app.viewModels.employeeViewModel = new kendo.data.ObservableObject({
        currentItem: null,
        isEdit: false,

        onInitList: function () {
            var that = this;

            var dataSource = new OfflineJSDODataSource({
                name: "Employee",
                schema: {
                    model: {
                        FullName: function () {
                            return this.LastName + ', ' + this.FirstName;
                        },

                        ImageURI: function () {
                            return "img/" + (this.EmpNum <= 10 ? this.EmpNum : "unknown") + ".jpg";
                        }
                    }
                }
            });

            that.model.set("dataSource", dataSource);
        },

        onClickListItem: function (e) {
            app.mobileApp.navigate("views/employeeDetailView.html?uid=" + e.dataItem.uid);
        },

        onShowDetail: function (e) {
            var that = this,
                item = that.model.dataSource.getByUid(e.view.params.uid);

            that.model.set("currentItem", item);
            that.model.set("isEdit", false);
        },

        onEdit: function () {
            var that = this;

            that.set("isEdit", true);
        },

        onSave: function () {
            var that = this;

            that.dataSource.sync();
            app.mobileApp.navigate("#:back");
        },

        onCancel: function () {
            var that = this;

            if (that.dataSource.hasChanges()) {
                that.dataSource.cancelChanges();
            }
            app.mobileApp.navigate("#:back");
        }
    });
})(jQuery);
