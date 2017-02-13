(function ($) {
    app.viewModels.menuViewModel = new kendo.data.ObservableObject({
        isOnline: false,
        welcome: "",

        onInit: function (e) {
            var that = this;

            app.bind("online", function () {
                that.model.set("isOnline", app.isOnline());
            });

            app.bind("offline", function () {
                that.model.set("isOnline", app.isOnline());
            });
        },

        onShow: function() {
            var that = this;

            that.model.set("isOnline", app.isOnline());
            that.model.set("welcome", "Welcome " + app.username);
        },

        logout: function () {
            app.logout(function () {
                app.mobileApp.navigate("views/loginView.html");
            });
        }
    });
})(jQuery);
