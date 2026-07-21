        const id = new URLSearchParams(location.search).get("id");
        location.replace(`school-view.html?school=h${id ? `&id=${encodeURIComponent(id)}` : ""}`);
    
