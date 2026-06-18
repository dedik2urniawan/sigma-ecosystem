async function test() {
    const res = await fetch("http://localhost:3000/api/mbg/supervisi");
    const json = await res.json();
    const item = json.data[0];
    const { id, created_at, ...updateData } = item;
    
    // Attempt patch
    const patchRes = await fetch(`http://localhost:3000/api/mbg/supervisi/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item)
    });
    
    const patchJson = await patchRes.json();
    console.log("Patch response:", patchRes.status, patchJson);
}

test();
