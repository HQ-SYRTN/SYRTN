        const id = new URLSearchParams(location.search).get("id");
        location.replace(`school-write.html?school=s${id ? `&id=${encodeURIComponent(id)}` : ""}`);
    
