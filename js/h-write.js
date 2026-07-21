        const id = new URLSearchParams(location.search).get("id");
        location.replace(`school-write.html?school=h${id ? `&id=${encodeURIComponent(id)}` : ""}`);
    
