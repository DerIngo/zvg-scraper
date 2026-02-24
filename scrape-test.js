async function getHtml(ger_name, land_abk, ger_id) {
    const body = new URLSearchParams({
      ger_name: ger_name,
      order_by: "2",
      land_abk: land_abk,
      ger_id: ger_id,
    });
    
    const res = await fetch(
      "https://www.zvg-portal.de/index.php?button=Suchen",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Referer": "https://www.zvg-portal.de",
          "User-Agent": "Mozilla/5.0",
        },
        body,
      }
    );
    const html = await res.text();
    return html;
}


  const html = await getHtml("Ahaus", "nw", "R2701");
  console.log(html);
  console.log("--------------------------------");
