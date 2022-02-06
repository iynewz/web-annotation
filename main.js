/**
 * Get the node name for use in generating an xpath expression.
 *
 * @param {Node} node
 */
function getNodeName(node) {
    const nodeName = node.nodeName.toLowerCase();
    let result = nodeName;
    if (nodeName === '#text') {
        result = 'text()';
    }
    return result;
}

/**
 * Get the index of the node as it appears in its parent's child list
 *
 * @param {Node} node
 */
function getNodePosition(node) {
    let pos = 0;
    /** @type {Node|null} */
    let tmp = node;
    while (tmp) {
        if (tmp.nodeName === node.nodeName) {
            pos += 1;
        }
        tmp = tmp.previousSibling;
    }
    return pos;
}

function getPathSegment(node) {
    const name = getNodeName(node);
    const pos = getNodePosition(node);
    return `${name}[${pos}]`;
}

/**
 * A simple XPath generator which can generate XPaths of the form
 * /tag[index]/tag[index].
 *
 * @param {Node} node - The node to generate a path to
 * @param {Node} root - Root node to which the returned path is relative
 */
function xpathFromNode(node, root) {
    let xpath = '';

    /** @type {Node|null} */
    let elem = node;
    while (elem !== root) {
        if (!elem) {
            throw new Error('Node is not a descendant of root');
        }
        xpath = getPathSegment(elem) + '/' + xpath;
        elem = elem.parentNode;
    }
    xpath = '/' + xpath;
    xpath = xpath.replace(/\/$/, ''); // Remove trailing slash

    return xpath;
}

/**
 * Return the `index`'th immediate child of `element` whose tag name is
 * `nodeName` (case insensitive).
 *
 * @param {Element} element
 * @param {string} nodeName
 * @param {number} index
 */
function nthChildOfType(element, nodeName, index) {
    nodeName = nodeName.toUpperCase();

    let matchIndex = -1;
    for (let i = 0; i < element.children.length; i++) {
        const child = element.children[i];
        if (child.nodeName.toUpperCase() === nodeName) {
            ++matchIndex;
            if (matchIndex === index) {
                return child;
            }
        }
    }

    return null;
}

/**
 * Evaluate a _simple XPath_ relative to a `root` element and return the
 * matching element.
 *
 * A _simple XPath_ is a sequence of one or more `/tagName[index]` strings.
 *
 * Unlike `document.evaluate` this function:
 *
 *  - Only supports simple XPaths
 *  - Is not affected by the document's _type_ (HTML or XML/XHTML)
 *  - Ignores element namespaces when matching element names in the XPath against
 *    elements in the DOM tree
 *  - Is case insensitive for all elements, not just HTML elements
 *
 * The matching element is returned or `null` if no such element is found.
 * An error is thrown if `xpath` is not a simple XPath.
 *
 * @param {string} xpath
 * @param {Element} root
 * @return {Element|null}
 */
function evaluateSimpleXPath(xpath, root) {
    const isSimpleXPath =
        xpath.match(/^(\/[A-Za-z0-9-]+(\[[0-9]+\])?)+$/) !== null;
    if (!isSimpleXPath) {
        throw new Error('Expression is not a simple XPath');
    }

    const segments = xpath.split('/');
    let element = root;

    // Remove leading empty segment. The regex above validates that the XPath
    // has at least two segments, with the first being empty and the others non-empty.
    segments.shift();

    for (let segment of segments) {
        let elementName;
        let elementIndex;

        const separatorPos = segment.indexOf('[');
        if (separatorPos !== -1) {
            elementName = segment.slice(0, separatorPos);

            const indexStr = segment.slice(separatorPos + 1, segment.indexOf(']'));
            elementIndex = parseInt(indexStr) - 1;
            if (elementIndex < 0) {
                return null;
            }
        } else {
            elementName = segment;
            elementIndex = 0;
        }

        const child = nthChildOfType(element, elementName, elementIndex);
        if (!child) {
            return null;
        }

        element = child;
    }

    return element;
}

/**
 * Finds an element node using an XPath relative to `root`
 *
 * Example:
 *   node = nodeFromXPath('/main/article[1]/p[3]', document.body)
 *
 * @param {string} xpath
 * @param {Element} [root]
 * @return {Node|null}
 */
function nodeFromXPath(xpath, root = document.body) {
    try {
        return evaluateSimpleXPath(xpath, root);
    } catch (err) {
        return document.evaluate(
            '.' + xpath,
            root,

            // nb. The `namespaceResolver` and `result` arguments are optional in the spec
            // but required in Edge Legacy.
            null /* namespaceResolver */,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null /* result */
        ).singleNodeValue;
    }
}


const quotes = [];

/*This function push what the user select into the quotes array */
function showTooltip(e) {
    const quote = window.getSelection().toString();
    if (quote.length <= 0) {
        tooltipDisappear();
        return;
    }

    tooltipAppear(e.pageX, e.pageY);
}

function getAnchor() {
    let selectedText = window.getSelection();
    console.log(selectedText);
    let text = selectedText.anchorNode.parentElement.textContent;
    /*characters to be escaped [.*+?^${}()|[\]\\]*/
    let quote = selectedText.toString().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    console.log(`parentParagraph: ${text}, selected: ${quote}`);
    let anchorOffset = selectedText.anchorOffset;
    let focusOffset = selectedText.focusOffset;
    let offset = (anchorOffset < focusOffset ? anchorOffset : focusOffset);

    // console.log("anchorOffset", anchorOffset);
    // console.log("focusOffset", focusOffset);
    // console.log("offset", offset);

    // var before = text.substring(selectedText.anchorOffset - 20, selectedText.anchorOffset);
    // var after = text.substring(selectedText.extentOffset, selectedText.extentOffset + 20);
    // before = before.length >= 1 ? before : null;
    // after = after.length >= 1 ? after : null;
    // console.log(`text: ${text} before: ${before} after: ${after}`);

    return {
        // pageid = 1,
        // userid = 1,
        context: text,
        // quote is a substring of parentParagraph
        quote,
        // use offset to know the position of the quote in its parentParagraph
        offset,
        xpath: xpathFromNode(selectedText.anchorNode.parentElement, document.body),
    }
}

function addHightlight() {
    console.log('activated!');
    const anchor = getAnchor();
    quotes.push(anchor);
    console.log(quotes);
    tooltipDisappear();

    renderQuote();
}

function renderQuote() {
    for (quote of quotes) {
        console.log("quote", quote);

        let { xpath, context, quote: text, offset } = quote;

        var targetParent = nodeFromXPath(xpath, document.body);
        console.log(targetParent);

        //     /*https://developer.mozilla.org/zh-CN/docs/Web/API/Node/textContent 改写成 textContent */
        if (context === targetParent.textContent) {
            console.log("nice!");
        }
        let pattern = new RegExp(`${text}`, "gi");
        targetParent.innerHTML = targetParent.innerHTML.replace(pattern, match => {
            console.log('match!', match);
            return `<mark>${text}</mark>`;
        });
        console.log(targetParent.innerHTML);
    }
}


window.addEventListener('mouseup', e => {
    showTooltip(e);
}
)


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