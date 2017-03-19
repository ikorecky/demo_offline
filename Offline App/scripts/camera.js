
document.addEventListener("deviceready", onDeviceReady, false);
 
function id(element) {
    return document.getElementById(element);
}

function onDeviceReady() {
    
    navigator.splashscreen.hide();
    cameraApp = new cameraApp();
    
    cameraApp.run();
}

function cameraApp(){}

cameraApp.prototype={
    _pictureSource: null,
    
    _destinationType: null,
    
    _sourceType: null,

    run: function () {
        var that = this;
       
	    that._pictureSource = navigator.camera.PictureSourceType;
	    that._destinationType = navigator.camera.DestinationType;
        that._sourceType = navigator.camera.PictureSourceType;
	 
        //////////////////////////////////////////////
        //
        //////////////////////////////////////////////
	  
	    $('body').on('click', ".capturePhotoButtonClass", function () {
	       // alert($(this).attr('id'));
	        addEventListener("click", that._capturePhoto.apply(that, arguments,myid= $(this).attr('id')));
	    });
	    $('body').on('click', ".scanButtonClass", function () {
	        // alert($(this).attr('id'));
	        addEventListener("click", that._scan.call(that, arguments, myid = $(this).attr('id')));
	    });

	   
    },
      _capturePhoto: function () {
         var that = this;
         
         var capturedPhoto = myid;
        //change photo
         if (capturedPhoto.endsWith("_")) {
             navigator.camera.getPicture(function () {

                 that._onPhotoDataSuccess.apply(that, arguments, myid);
             }, function () {
                 that._onFail.apply(that, arguments, myid);
             }, {
                 quality: 20,
                 allowEdit: true,
                 destinationType: that._destinationType.DATA_URL,
                 //sourceType: that._sourceType.PHOTOLIBRARY

             });
         }
         
         else if (document.getElementById(capturedPhoto).style.color != "red") {
             navigator.camera.getPicture(function () {
               
                        var popImg = "#popImgcapturedPhoto"  +capturedPhoto.substr(-1);
             
                 document.getElementById(capturedPhoto).style.color = "red";
                that._onPhotoDataSuccess.apply(that, arguments,myid);
            }, function () {
                that._onFail.apply(that, arguments,myid);
            }, {
                quality: 20,
                allowEdit: true,
                destinationType: that._destinationType.DATA_URL,
                //sourceType: that._sourceType.PHOTOLIBRARY
            });
              
         }
         else if (document.getElementById(capturedPhoto).style.color == "red") {
            
                var popImg = "#popImgcapturedPhoto" +capturedPhoto.substr(-1);
                
               $(popImg).kendoMobileModalView("open");
         }
    },
    _onPhotoDataSuccess: function (imageData) {
        
        var capturedPhoto = myid.toString();
        if (capturedPhoto.endsWith("_")) {
            var n = capturedPhoto.length;
            capturedPhoto = capturedPhoto.slice(0, n - 1);
            
        }

       // var imageURI =  imageData;
        var imageURI = "data:image/jpeg;base64," + imageData;

            
        if (capturedPhoto == "capturePhoto1") {
            var part1 = document.getElementById('part1');
            part1.src = imageURI;
            }
      
    }
}
