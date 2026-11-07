(function () {
  document.querySelectorAll(".bank-details dd").forEach((value) => {
    if (value.textContent.trim() === "Not provided") {
      value.classList.add("unconfigured-value");
    }
  });

  const instructions = document.querySelector(".payment-instructions p");
  if (instructions && instructions.textContent.trim().startsWith("Please contact the church")) {
    instructions.classList.add("unconfigured-value");
  }
})();
