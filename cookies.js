var user_has_scrolled;
$(document).ready(function(){
if (get_cookie("allowcookies")==""){
set_cookie("allowcookies","0",365);
set_cookie("msgcookies","1",365);
}
else{
if (get_cookie("allowcookies")=="0"){ set_cookie("allowcookies","1",365);}
}
user_has_scrolled = 0;

$(".closebtn").click(function(){
$("#cookies-banner").css('display', 'none');
set_cookie("allowcookies","1",365);
erase_cookie("msgcookies");
});
});

window.onscroll = scroll;
function scroll()
{
 if (user_has_scrolled != 1)
 {
user_has_scrolled = 1;
set_cookie("allowcookies","1",365);
 }
}


function set_cookie(name,value,days)
{
 if (days)
 {
   var date = new Date();
   date.setTime(date.getTime() + (days*24*60*60*1000));
   var expires = "; expires=" + date.toGMTString();
 }
 else var expires = "";
 document.cookie = name + "=" + value+expires+"; path=/";
}

function get_cookie(cname)
{
var name = cname + "=";
var ca = document.cookie.split(';');
for(var i=0; i<ca.length; i++)
{
 var c = ca[i].trim();
 if (c.indexOf(name)==0) return c.substring(name.length,c.length);
}
return "";
}

function erase_cookie(name)
{
 set_cookie(name,"",-1);
}
