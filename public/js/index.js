$(function() {
    $('.text').typed({
        strings: ["<strong>Webscrapping like </strong><strong class='primary'> Hero.</strong>" ,"<strong>Easy & </strong><strong class='primary'> powerful !!.</strong>"],
        typeSpeed: 100 ,
        loop : true
    });
    $(window).on('scroll' , function(){
        var top = $(window).scrollTop();
         if(top>=60){
           $("nav").addClass('secondary'); 
         }  
         else 
             if($("nav").hasClass('secondary')){
                 $("nav").removeClass('secondary'); 
             }
     });
      //smooth scroll jquery npm
      $("a.smooth-scroll").on('click' ,function (event) {
    
        event.preventDefault();
        
        var section = $(this).attr("href");
    
        $('html, body').animate({
            scrollTop: $(section).offset().top
        }, 1250, "easeInOutExpo");
    });
    
    new WOW().init();
});

