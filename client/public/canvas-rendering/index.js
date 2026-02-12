var j=document.getElementById("canvas"),b=j.transferControlToOffscreen(),m=new Worker("./worker.js");m.postMessage({canvas:b},[b]);
