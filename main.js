var myDate = new Date();
console.log(myDate);

/*characters to be escaped [.*+?^${}()|[\]\\]*/

function highlightSelected() {
    let textToHighlight = window.getSelection();
    console.log("textToHighlight", textToHighlight);
    stringToHighlight = textToHighlight.toString().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    let pattern = new RegExp(`${stringToHighlight}`, "gi");
    console.log(pattern);
    let anchorPara = textToHighlight.anchorNode.parentElement;
    console.log("anchorPara", anchorPara);
    console.log(anchorPara.innerHTML);
    anchorPara.innerHTML = anchorPara.innerText.replace(pattern, match => `<mark>${match}</mark>`);
    console.log(anchorPara.innerHTML);
}

window.addEventListener('mouseup', e => {
    highlightSelected();
});
