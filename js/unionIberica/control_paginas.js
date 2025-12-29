  function isAlliancePage() {
    const params = new URLSearchParams(window.location.search);
    return params.get("page") === "alliance";
  }

  function isAllianceMemberList() {
    const params = new URLSearchParams(window.location.search);
    return params.get("page") === "alliance" && params.get("mode") === "memberList";
  }

  function isEmpirePage() {
    const params = new URLSearchParams(window.location.search);
    return params.get("page") === "Empire";
  }

  function isPaginaEstadisticas() {
    const params = new URLSearchParams(window.location.search);
    return (params.get("page") || "").toLowerCase() === "statistics";
  }
