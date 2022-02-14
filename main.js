let textNodes = [];
let range;

/*This function push what the user select into the quotes array */
function showTooltip(e) {
    const selObj = window.getSelection();
    range = selObj.getRangeAt(0);
    console.log("rangehere", range);
    if (range.collapsed) {
        tooltipDisappear();
        return;
    }
    tooltipAppear(e.pageX, e.pageY);
}

window.addEventListener('mouseup', e => {
    showTooltip(e);
})


function tooltipAppear(x, y) {
    const tooltip = document.getElementById('tooltip');
    tooltip.style.display = 'flex';
    tooltip.style.left = x - tooltip.clientWidth / 2 + 'px';
    tooltip.style.top = y - tooltip.clientHeight * 1.5 + 'px';
}

function tooltipDisappear() {
    const tooltip = document.getElementById('tooltip');
    tooltip.style.display = 'none';
}

function addHightlight() {
    let { commonAncestorContainer, startContainer, endContainer } = range;
    // console.log("commonAncestorContainer", commonAncestorContainer);
    // console.log("startContainer", startContainer);
    // console.log("endContainer", endContainer);
    textNodes = [];
    this.DFS(commonAncestorContainer, (node) => {
        /*对于起始节点、结束节点、或者是范围内的节点，如果是文本节点，则收集起来 */
        if (
            node === startContainer ||
            node === endContainer ||
            range.isPointInRange(node, 0)
        ) {
            if (node.nodeType === 3) {
                textNodes.push(node);
            }
        }
    }
    )
    handleTextNodes();
}

/* traverse through DOM tree - DFS */
function DFS(node, callback = () => { }) {
    callback(node);
    if (node && node.childNodes) {
        for (let i = 0; i < node.childNodes.length; i++) {
            this.DFS(node.childNodes[i], callback);
        }
    }
}

let markId = 0;
function handleTextNodes() {
    markId++;
    textNodes.forEach((node) => {
        let startOffset = 0;
        let endOffset = node.nodeValue.length;
        if (
            node === range.startContainer &&
            range.startOffset !== 0
        ) {
            startOffset = range.startOffset;
        }
        if (node === range.endContainer && range.endOffset !== 0) {
            endOffset = range.endOffset;
        }
        replaceTextNode(node, markId, startOffset, endOffset);
        console.log("node, markId, startOffset, endOffset", node, markId, startOffset, endOffset);
    }
    )
    /* 获取刚刚生成的所有该 id 的划线元素，序列化进行存储  serialize */
    serialize(document.querySelectorAll('.mark_id_' + markId));
}

/* 整块包裹后划线 */
function replaceTextNode(node, markId, startOffset, endOffset) {
    console.log("markId:", markId);
    console.log("textNodes", textNodes);
    let fragment = document.createDocumentFragment();
    let startNode = null;
    let endNode = null;
    // 截取前一段不需要划线的文本
    if (startOffset !== 0) {
        startNode = document.createTextNode(node.nodeValue.slice(0, startOffset));
    }
    // 截取后一段不需要划线的文本
    if (endOffset !== node.nodeValue.length) {
        endNode = document.createTextNode(node.nodeValue.slice(endOffset))
    }
    startNode && fragment.appendChild(startNode);
    // 直接包裹整块文本
    let textNode = document.createElement('span');
    textNode.className = 'markLine mark_id_' + markId;
    textNode.setAttribute('data-id', markId);
    textNode.addEventListener('click', (e) => {
        console.log("点击事件，取消划线 function");
    })
    textNode.textContent = node.nodeValue.slice(startOffset, endOffset);
    fragment.appendChild(textNode);

    endNode && fragment.appendChild(endNode)
    // replace old node with new fragment
    node.parentNode.replaceChild(fragment, node); //error here
}

serializeData = [];

function serialize(markNodes) {
    console.log("markNodes to serlize:", markNodes);
    let root = document.querySelector(".blog-content");
    markNodes.forEach((markNode) => {
        /* 找到外层第一个非划线元素 */
        let { tagName, index } = getWrapNode(markNode, root);
        console.log("{ tagName, index }", { tagName, index });
        /*计算该 markNode 离外层第一个非划线元素的总的文本偏移量 */
        let offset = getTextOffset(markNode);
        console.log("offset", offset);
        serializeData.push({
            tagName,
            index,
            offset,
            id: markNode.getAttribute('data-id')
        })
    })
}
function getTextOffset(node) {
    let offset = 0;
    let parNode = node;
    while (parNode && parNode.classList.contains('markLine')) {
        /* 获取前面的兄弟元素的总字符数 */
        offset += getPrevSiblingOffset(parNode);
        parNode = node.parentNode;
    }
    return offset;
}

function getPrevSiblingOffset(node) {
    let offset = 0;
    let prevNode = node.previousSibling;
    while (prevNode) {
        offset += prevNode.nodeType === 3 ? prevNode.nodeValue.length : prevNode.textContent.length;
        prevNode = prevNode.previousSiblings;
    }
    return offset;
}

/* 找到外层第一个非划线元素 */
function getWrapNode(node, root) {
    let wrapNode = node.parentNode;
    while (wrapNode.classList.contains('markLine')) {
        wrapNode = wrapNode.parentNode;
    }
    let wrapNodeTagName = wrapNode.tagName;
    let wrapNodeIndex = -1;
    let els = root.getElementsByTagName(wrapNodeTagName);
    els = [...els].filter((item) => {/*过滤掉划线元素 */
        return !item.classList.contains('markLine');
    }).forEach((item, index) => {/*计算当前元素在其中的索引*/
        if (wrapNode === item) {
            wrapNodeIndex = index;
        }
    })
    return {
        tagName: wrapNodeTagName,
        index: wrapNodeIndex
    }
}

function deserialization() {
    let root = document.querySelector(".blog-content");
    /* 遍历序列化的数据 */
    serializeData.forEach((item) => {
        let els = root.getElementsByTagName(item.tagName)
        els = [...els].filter((item) => {
            return !item.classList.contains('markLine');
        })
        let wrapNode = els[item.index]
        let len = 0
        let end = false
        /* 遍历改元素的节点 */
        DFS(wrapNode, (node) => {
            if (end) {
                return;
            }
            if (node.nodeType === 3) {
                /* 如果当前文本节点的字符数 + 之前的总数大于 offset，说明要找的字符就在该文本内 */
                if (len + node.nodeValue.length > item.offset) {
                    /* 计算在该文本里的偏移量 */
                    let startOffset = item.offset - len;
                    /* 因为我们是切割到单个字符，所以总长度也就是1 */
                    let endOffset = startOffset + 1;
                    replaceTextNode(node, item.id, startOffset, endOffset);
                    end = true;
                }
                /* 累加字符数 */
                len += node.nodeValue.length
            }
        })
    })
}


function showCancelTip(e) {
    let tar = e.target;
    console.log("showCancelTip");
}
// if (tar.classList.contains('markLine')) {
//     e.stopPropagation();
//     e.preventDefault();
//     // 获取划线id
//     let clickId = tar.getAttribute('data-id');
//     // 获取该id的所有划线元素
//     let markNodes = document.querySelectorAll('.mark_id_' + clickId);
//     // 选择第一个和最后一个文本节点来作为range边界
//     let startContainer = markNodes[0].firstChild;
//     let endContainer = markNodes[markNodes.length - 1].lastChild;
//     range = document.createRange();
//     range.setStart(startContainer, 0);
//     range.setEnd(
//         endContainer,
//         endContainer.nodeValue.length
//     );
//     cancelTipAppear(e.pageX, e.pageY);
// }


function cancelTipAppear(x, y) {
    const cancelTip = document.getElementById('cancelTip');
    cancelTip.style.display = 'flex';
    cancelTip.style.left = x - cancelTip.clientWidth / 2 + 'px';
    cancelTip.style.top = y - cancelTip.clientHeight * 1.5 + 'px';
}