(function ($) {
    app.viewModels.loginViewModel = new kendo.data.ObservableObject({
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

        onLogin: function (e) {
            var that = this;

            that.set("disableLogin", true);

            app.login(that.get("username"), that.get("password"))
                .done(function () {
                    app.mobileApp.navigate("views/menuView.html?ref=login");
                })
                .fail(function () {
                    that.set("disableLogin", false);
                })
        },

        _enableUI: function () {
            var that = this,
                username = localStorage.getItem("username") || "",
                password = localStorage.getItem("password") || "",
                isOnline = app.isOnline();

            if (isOnline) {
                that.set("username", "");
                that.set("password", "");
            }
            else {
                that.set("username", username);
                that.set("password", "");
            }

            that.set("isOnline", isOnline);
            that.set("disableLogin", false);
        }
    });
})(jQuery);
