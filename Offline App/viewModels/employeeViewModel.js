(function ($) {
    app.viewModels.employeeViewModel = new kendo.data.ObservableObject({
        currentItem: null,
        isEdit: false,

        onInitList: function () {
            var that = this;

            that.model.jsdo = new OfflineJSDO({
                name: "Employee",
                dataSource: {
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
                }
            });

            $("#employee-list").kendoMobileListView({
                dataSource: that.model.jsdo.dataSource,
                template: "<span class=\"image\"><img src=\"#: ImageURI() #\" /></span>"
                + "<span class=\"title\">#: FullName() #</span>"
                + "<span class=\"address\">#: Address #, #: City #, #: State #</span>"
                + "<span class=\"phone\">#: HomePhone #</span>",

                click: that.model.onClickListItem
            });
        },

        onShowList: function () {
            var that = this;

            // that.model.jsdo.dataSource.read();
        },

        onClickListItem: function (e) {
            app.mobileApp.navigate("views/employeeDetailView.html?uid=" + e.dataItem.uid);
        },

        onShowDetail: function (e) {
            var that = this,
                item = that.model.jsdo.dataSource.getByUid(e.view.params.uid);

            that.model.set("currentItem", item);
            that.model.set("isEdit", false);
        },

        onEdit: function () {
            var that = this;

            that.set("isEdit", true);
        },

        onSave: function () {
            var that = this;

            that.jsdo.dataSource.sync();
            app.mobileApp.navigate("#:back");
        },

        onCancel: function () {
            var that = this;

            if (that.jsdo.dataSource.hasChanges()) {
                that.jsdo.dataSource.cancelChanges();
            }
            app.mobileApp.navigate("#:back");
        }
    });
})(jQuery);
