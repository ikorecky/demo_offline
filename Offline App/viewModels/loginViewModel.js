(function ($) {
    app.viewModels.loginViewModel = new kendo.data.ObservableObject({
        username: "",
        password: "",
        isOnline: false,
        isLoginDisabled: false,

        onInit: function (e) {
            var that = this;

            // currently the only way to know the mobile app dom manipulations are complete
            that.one("show", function () {
                app.onShow();
            });

            document.addEventListener("online", doRefresh);
            document.addEventListener("offline", doRefresh);

            function doRefresh() {
                if (app.mobileApp.view() === that) {
                    that.model._enableUI()
                }
            }
        },

        onShow: function (e) {
            var that = this;

            that.model._enableUI();
        },

        login: function (e) {
            var that = this;

            app.login(that.get("username"), that.get("password"), function () {
                app.mobileApp.navigate("views/menuView.html?ref=login");
            });
        },

        _enableUI: function () {
            var that = this,
                username = localStorage.getItem("username") || "",
                password = localStorage.getItem("password") || "",
                isOnline = app.isOnline(),
                isLoginDisabled = (!isOnline && password === "");

            if (isOnline) {
                that.set("username", "");
                that.set("password", "");
            }
            else {
                that.set("username", username);
                that.set("password", "");
            }

            that.set("isOnline", isOnline);
            that.set("isLoginDisabled", isLoginDisabled);

            if (isLoginDisabled) {
                navigator.notification.alert("First login must be online.");
            }
        }
    });
})(jQuery);
