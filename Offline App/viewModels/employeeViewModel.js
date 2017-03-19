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
       
            that.model.set("currentItem", null); // force calculated fields to refresh
            that.model.set("currentItem", item);
            ////////////////////
            //changed by itamar
            //show image
            ////////////////////////////////////////////////////////
            $("#part1").attr("src", ""); // reset image src 

             if(item.url_PhotoWorkerId!="null"){
                   var imageObj = $.parseJSON(item.PhotoWorkerId);
                       var part1 = "https://www.rollbase.com/rest/jsdo" + imageObj.src + "?objName=WorkerObject";
                       $("#part1").attr("src", part1);
                       imagefile = $('#part1').attr('src');
                    }
             ////////////////////////////////////////////////////////       
            that.model.set("isEdit", (e.view.params.isEdit === "true" ? true : false));
             console.log(that.model.get("isEdit", true));
        },

        onEdit: function () {
            var that = this;

            that.set("isEdit", true);
        },
        ////////////////////
        //changed by itamar
        //close image pop up
        ////////////////////////////////////////////////////////
        closePopUpImg1: function (e) {$("#popImgcapturedPhoto1").kendoMobileModalView("close");  },
        ////////////////////////////////////////////////////////
        onSave: function () {
            var that = this;
            ////////////////////
            //changed by itamar
            //call upluadPhoto with image src
            ////////////////////////////////////////////////////////
            imageSrc = $('#part1').attr('src');
            that.upluadPhoto(imageSrc, "PhotoWorkerId");
            ////////////////////////////////////////////////////////
            if (that.dataSource.hasChanges()) {
                that.dataSource.sync();
                app.mobileApp.navigate("#:back");
            }
            else {
                that.set("isEdit", false);
            }
        },
        ////////////////////
        //changed by itamar
        //upluadPhoto function  
        //params : imagefile- image src , fieldName - string field name
        //alert onFileUploadSuccess or onFileTransferFail
        ////////////////////////////////////////////////////////
       upluadPhoto: function (imagefile, fieldName) {
          
       var that = this,
           
         item =   that.get("currentItem");
    
        var options = new FileUploadOptions();
        options.fileKey = "fileContents";
        options.fileName = fieldName;
        if (cordova.platformId == "android") {
            options.fileName += ".jpeg"
        }
        options.mimeType = "image/jpeg";
        options.params = {};  // if we need to send parameters to the server request 
        options.headers = {
            Connection: "Close"
        };
        options.chunkedMode = false;
      
       if (fieldName === "PhotoWorkerId") {
            var imageObj = $.parseJSON(item.PhotoWorkerId);
            var ft = new FileTransfer();

            var urlRB = "https://www.rollbase.com/rest/jsdo" + imageObj.src + "?objName=WorkerObject";
       
            ft.upload(
           imagefile,
           encodeURI(urlRB),
           onFileUploadSuccess,
           onFileTransferFail,
           options,
           true);
        }
       
    


        function onFileUploadSuccess(result) {
        
            alert("onFileUploadSuccess");
        }
        function onFileTransferFail(error) {
            console.log("FileTransfer Error:");
            console.log("Code: " + error.code);
            console.log("Body:" + error.body);
            console.log("Source: " + error.source);
            console.log("Target: " + error.target);
             alert("Error loading the image FileTransfer Error: " + " Code: " + error.code + " Body:" + error.body + " Source: " + error.source + " Target: " + error.target);
        }
    },
        ////////////////////////////////////////////////////////
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
                    firstName: "",
                    lastName: "",
                    WorkerId: "",
                   // Worker_Contractor: "",
                    dateSite_start: "",
                    dateSite_start: ""
                 });
            that.dataSource.sync();
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
