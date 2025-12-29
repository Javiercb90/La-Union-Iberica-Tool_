  function isLaUnionIberica() {
  const rows = document.querySelectorAll("table tr");

    for (const row of rows) {
      const tds = row.querySelectorAll("td");
      if (tds.length < 2) continue;

      if (
        tds[0].textContent.trim().toUpperCase() === "NOMBRE" &&
        tds[1].textContent.trim().toUpperCase() === "LA UNION IBERICA"
      ) {
        return true;
      }
    }
  return false;
  }

  
  function isAlliancePage() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("page") !== "alliance") return false;

  return isLaUnionIberica();
  }

  function isAllianceMemberList() {
  const params = new URLSearchParams(window.location.search);

    if (
      params.get("page") !== "alliance" ||
      params.get("mode") !== "memberList"
    ) {
      return false;
    }

  return isLaUnionIberica();
  }

  function isEmpirePage() {
    const params = new URLSearchParams(window.location.search);
    return params.get("page") === "Empire";
  }

  function isPaginaEstadisticas() {
    const params = new URLSearchParams(window.location.search);
    return (params.get("page") || "").toLowerCase() === "statistics";
  }
