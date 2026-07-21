        const id = new URLSearchParams(location.search).get("id");
        location.replace(`school-view.html?school=s${id ? `&id=${encodeURIComponent(id)}` : ""}`);
    
