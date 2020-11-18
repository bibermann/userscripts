// ==UserScript==
// @match        *://gitlab.com/*
// @include      /^https?://(git|gl)\./
// @name         GitLab focus
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Increase GitLab productivity.
// @author       Fabian Sandoval Saldias <fabianvss@gmail.com>
// @author       Dimitar Pavlov
// @author       Simon Pamies
// @grant        none
// ==/UserScript==

/* Detailed description
 * ====================
 *
 * New elements:
 * - labels for issues in related issues lists
 *
 * Reformat elements:
 * - board cards (downsize and rearrange elements inside a card)
 *
 * Highlight elements:
 * - related lists (add light yellow/orange background to open issues/MRs and downsize closed issues/MRs)
 *
 * Dim elements:
 * - timeline items (downsize non-comments)
 * - placeholders (change font color to light gray)
 *
 * Changelog
 * =========
 *
 * v0.2 (2020-11-18)
 * - add labels to related issues
 * - fix labels in board cards are not aligned right when spanning multiple lines
 *
 * v0.1.2 (2020-10-21)
 * - dim placeholders
 *
 * v0.1.1 (2020-10-20)
 * - add orange background to open MRs
 *
 * v0.1 (2020-09-24)
 * - initial version
 *
 * Credits
 * =======
 *
 * - label-creation code is based on a UserScript by Dimitar Pavlov,
 *     which in turn is based on a UserScript by Simon Pamies;
 *     see here for the code: https://gitlab.com/gitlab-org/gitlab/-/issues/7759#note_229973031
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
          justify-content: flex-end;
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

        *:not(.dropdown) > *::placeholder,
        .dropdown.show > *::placeholder,
        .is-default {
          color: lightgray !important;
        }

        /* adjust path id text (just before issue number) */

        ul.related-items-list .path-id-text {
          font-size: 11px;
          max-width: none;
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
                    onDomNodesAdded()
                }
            }
        });
    });

    function onDomNodesAdded() {
        $('ul.related-items-list li').each(function(index, element) {
            const el = $(element)
            if(!el.hasClass('gitlab-focus-processed')) {
                el.addClass('gitlab-focus-processed');
                processRelatedItemsListItem(el);
            }
        });
    }

    function processRelatedItemsListItem(el) {
        if(el.find('svg.issue-token-state-icon-closed').length > 0)
            el.addClass('gitlab-focus-closed');

        var url = extractRelatedIssueJSONUrl(el);
        $.getJSON(url, function(data) {
            var labelsArea = prepareLabelsArea(el);
            $(data.labels).each(function(index, jsonElement) {
                labelsArea.append(createLabelElement(jsonElement, url,   data.project_id));
            });
        });
    }

    var labelsAreaTemplate = '<div class="item-label-area item-path-id d-flex align-items-center mr-2 mt-2 mt-xl-0 ml-xl-2 flex-grow justify-content-end"></div>';
    var labelTemplate = `
        <span
            class="gl-label gl-label-sm"
            style="color: {TCOLOR}"
        >
            <a
                class="gl-link gl-label-link has-tooltip"
                data-html="true"
                data-title="{DESC}"
                href="{URL}"
                data-original-title=""
                title=""
                data-original="~{ID}"
                data-project="{PROJECTID}"
                data-label="{ID}"
            >
                <span
                    class="gl-label-text"
                    data-container="body"
                    data-html="true"
                    style="background-color: {COLOR}"
                >
                    {TITLE}
                </span>
            </a>
        </span>
        <span>
            &nbsp;
        </span>;
        `
    var scopedLabelTemplate = `
        <span
            class="gl-label gl-label-scoped gl-label-sm"
            style="--label-inset-border: inset 0 0 0 1px {COLOR}; color: {TCOLOR}"
        >
            <a
                class="gl-link gl-label-link has-tooltip"
                data-html="true"
                data-title="{DESC}"
                href="{URL}"
                data-original-title=""
                title=""
                data-original="~{ID}"
                data-project="{PROJECTID}"
                data-label="{ID}"
            >
                <span
                    class="gl-label-text"
                    data-container="body"
                    data-html="true"
                    style="background-color: {COLOR}"
                >
                    {SCOPE}
                </span>
                <span
                    class="gl-label-text-scoped"
                    data-container="body"
                    data-html="true"
                    style="color: {SCOPEDTCOLOR}"
                >
                    {TITLE}
                </span>
            </a>
        </span>
        <span>
            &nbsp;
        </span>;
        `

    function extractRelatedIssueJSONUrl(el) { return el.find('.sortable-link').attr('href') + '.json'; }
    function extractIssuesBaseLabelUrl(url) { return url.substring(0, url.lastIndexOf('/')) + '?label_name='; }
    function formatScopedLabelTooltip(description) { return description !== null ? '<span class=\'font-weight-bold scoped-label-tooltip-title\'>Scoped label</span><br />' + description : '' }
    function getScopedTitleColor(issueJson) { return issueJson.text_color === '#FFFFFF' ? issueJson.color : issueJson.text_color }

    function prepareLabelsArea(el) {
        el.find('div.item-contents').removeClass('flex-xl-nowrap');
        el.find('div.item-meta').removeClass('justify-content-start').removeClass('justify-content-md-between');
        return $(labelsAreaTemplate).insertAfter(el.find('div.item-path-area'));
    }

    function createLabelElement(json, issueUrl, projectId) {
        const labelNameParts = json.title.split('::');
        if(labelNameParts.length === 1)
            return $(labelTemplate
                .replace(/{ID}/g, json.id)
                .replace(/{PROJECTID}/g, projectId)
                .replace(/{COLOR}/g, json.color)
                .replace(/{TCOLOR}/g, json.text_color)
                .replace(/{TITLE}/g, json.title)
                .replace(/{DESC}/g, json.description)
                .replace(/{URL}/g, extractIssuesBaseLabelUrl(issueUrl) + encodeURIComponent(json.title))
            );
        else
            return $(scopedLabelTemplate
                .replace(/{ID}/g, json.id)
                .replace(/{PROJECTID}/g, projectId)
                .replace(/{COLOR}/g, json.color)
                .replace(/{TCOLOR}/g, json.text_color)
                .replace(/{SCOPEDTCOLOR}/g, getScopedTitleColor(json))
                .replace(/{SCOPE}/g, labelNameParts[0])
                .replace(/{TITLE}/g, labelNameParts[1])
                .replace(/{DESC}/g, formatScopedLabelTooltip(json.description))
                .replace(/{URL}/g, extractIssuesBaseLabelUrl(issueUrl) + encodeURIComponent(json.title))
            );
    }
})();
