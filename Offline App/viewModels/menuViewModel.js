(function ($) {
    app.viewModels.menuViewModel = new kendo.data.ObservableObject({
        onLogin: function () {
            // create and load all data sources after login
            // so any pending changes will be synchronized after login
            app.dataSources.employeeDataSource = new EmployeeDataSource();
            app.loadDataSources();
        },

        onInit: function (e) {
            var that = this;

            app.bind("online", onOnlineOffline);
            app.bind("offline", onOnlineOffline);

            function onOnlineOffline() {
                that.model.set("isOnline", app.isOnline());
            }
        },

        onShow: function (e) {
            var that = this;

            that.model.set("isOnline", app.isOnline());
            that.model.set("welcome", "Welcome " + app.username);

            if (e.view.params.ref === "login") {
                that.model.onLogin();
            }
        },

        onLogout: function () {
            app.logout().done(function () {
                app.mobileApp.navigate("views/loginView.html");
            });
        }
    });
})(jQuery);
