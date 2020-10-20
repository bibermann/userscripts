// ==UserScript==
// @name         GitLab focus
// @namespace    http://tampermonkey.net/
// @version      0.1.1
// @description  Downsizes some unimportant and highlights some important elements.
// @author       fabianvss@gmail.com
// @match        *://gitlab.com/*
// @include      /^https?://(git|gl)\./
// @grant        none
// @require      http://code.jquery.com/jquery-3.5.1.min.js
// ==/UserScript==

/* Detailed description
 * ====================
 *
 * Changed elements:
 * - timeline items (downsize non-comments)
 * - board cards (downsize and rearrange elements inside a card)
 * - related lists (add light yellow/orange background to open issues/MRs and downsize closed issues/MRs)
 */

(function() {
    'use strict';

    let style = document.createElement('style');
    style.textContent = `
        /* timeline */

        li.timeline-entry.note.system-note.note-wrapper {
          font-size: x-small;
          margin-top: 0.5em;
          margin-bottom: 0;
        }

        li.timeline-entry.note.system-note.note-wrapper
        div.timeline-icon {
          transform: scale(0.75)
        }

        /* board items */

        .board-card {
          font-size: small;
          padding: 0.25rem 0.5rem;
          margin-bottom: 4px;
        }

        .board-card > div > div {
          margin: 0;
          padding: 0;
        }

        .board-card-header {
          float: left;
        }

        .board-card-labels {
          float: right;
        }

        .board-card-labels > span {
          margin: 0;
        }

        .board-card-footer {
          height: 1.5em;
          clear: both;
        }

        .board-card-title {
          font-size: smaller;
        }

        /* closed issues in related lists */

        .gitlab-focus-closed .item-title {
          font-size: smaller;
        }

        .gitlab-focus-closed svg {
          transform: scale(0.75);
        }

        /* colorize non-closed issues in related lists */

        ul.related-items-list li:not(.gitlab-focus-closed) {
          background-color: lightyellow;
        }

        #related-merge-requests ul.related-items-list li:not(.gitlab-focus-closed) {
          background-color: #ffeedf;
        }
        `
    document.body.append(style);

    $(document).ready(function() {
        mutationObserver.observe($(".content-block").get()[0], whatToObserve);
    });

    var whatToObserve = {childList: true, attributes: false, subtree: true, attributeOldValue: false};
    var mutationObserver = new MutationObserver(function(mutationRecords) {
        $.each(mutationRecords, function(index, mutationRecord) {
            if (mutationRecord.type === 'childList') {
                if (mutationRecord.addedNodes.length > 0) {
                    //DOM node added, do something
                    var closed_items = $('ul.related-items-list li:has(svg.issue-token-state-icon-closed)');
                    closed_items.addClass('gitlab-focus-closed');
                    console.log('added gitlab-focus-closed to ' + closed_items.length + ' items');
                }
            }
        });
    });
})();
