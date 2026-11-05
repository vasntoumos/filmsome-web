(function(){
  const params=new URLSearchParams(location.search);
  const explicit=params.get("lang");
  let current=explicit==="fr"||explicit==="en"?explicit:(navigator.language||"en").toLowerCase().startsWith("fr")?"fr":"en";
  function setLanguage(lang,updateUrl){
    current=lang;document.documentElement.lang=lang;
    document.querySelectorAll("[data-lang]").forEach(el=>{el.hidden=el.getAttribute("data-lang")!==lang;});
    document.querySelectorAll("[data-choose-lang]").forEach(el=>el.setAttribute("aria-pressed",String(el.dataset.chooseLang===lang)));
    document.querySelectorAll("[data-internal-legal]").forEach(el=>{
      const url=new URL(el.getAttribute("href").split("?")[0],location.origin);
      url.searchParams.set("lang",lang);
      el.href=url.pathname+url.search;
    });
    if(updateUrl){const url=new URL(location.href);url.searchParams.set("lang",lang);history.replaceState(null,"",url);}
  }
  document.querySelectorAll("[data-choose-lang]").forEach(el=>el.addEventListener("click",()=>setLanguage(el.dataset.chooseLang,true)));
  setLanguage(current,false);
})();