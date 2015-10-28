/* global YoastSEO: true, tinyMCE, wp, wpseoMetaboxL10n */
YoastSEO = ( 'undefined' === typeof YoastSEO ) ? {} : YoastSEO;
(function() {
	'use strict';

	/**
	 * wordpress scraper to gather inputfields.
	 * @constructor
	 */
	YoastSEO.WordPressScraper = function() {
		this.prepareSlugBinding();
	};

	/**
	 * On a new post, WordPress doesn't include the slug editor, since a post has not been given a slug yet.
	 * As soon as a title is chosen, an `after-autosave.update-post-slug` event fires that triggers an AJAX request
	 * to the server to generate a slug. On the response callback a slug editor is inserted into the page on which
	 * we can bind our Snippet Preview.
	 *
	 * On existing posts, the slug editor is already there and we can bind immediately.
	 */
	YoastSEO.WordPressScraper.prototype.prepareSlugBinding = function() {
		if ( document.getElementById( 'editable-post-name' ) === null ) {
			var that = this;
			jQuery( document ).on( 'after-autosave.update-post-slug', function() {
				that.bindSnippetCiteEvents( 0 );
			});
		} else {
			this.bindSlugEditor();
		}
	};

	/**
	 * When the `after-autosave.update-post-slug` event is triggered, this function checks to see if the slug editor has
	 * been inserted yet. If so, it does all of the necessary event binding. If not, it retries for a maximum of 5 seconds.
	 *
	 * @param {int} time
	 */
	YoastSEO.WordPressScraper.prototype.bindSnippetCiteEvents = function( time ) {
		time = time || 0;
		var slugElem = document.getElementById( 'editable-post-name' );
		var postNameElem = document.getElementById('post_name');

		if ( slugElem !== null ) {
			this.bindSlugEditor();

			// If the '#post_name' input field has not been set yet, we need to set it here with the textContent of the slugElem.
			// God knows why WordPress doesn't do this initially...
			if ( postNameElem.value === '' ) {
				postNameElem.value = slugElem.textContent;
			}

			YoastSEO.app.snippetPreview.unformattedText.snippet_cite = postNameElem.value;
			YoastSEO.app.refresh();
		} else if ( time < 5000 ) {
			time += 200;
			setTimeout( this.bindSnippetCiteEvents.bind( this, time ), 200 );
		}
	};

	/**
	 * We want to trigger an update of the snippetPreview on a slug update. Because the save button is not available yet, we need to
	 * bind an event within the scope of a clickevent of the edit button.
	 */
	YoastSEO.WordPressScraper.prototype.bindSlugEditor = function() {
		jQuery( '#edit-slug-box' ).on( 'click', '.edit-slug', function() {
			jQuery( '#edit-slug-buttons > button.save' ).on( 'click', function() {
				YoastSEO.app.refresh();
				YoastSEO.app.snippetPreview.unformattedText.snippet_cite = document.getElementById('post_name').value;
			} );
		} );
	};

	/**
	 * Get data from inputfields and store them in an analyzerData object. This object will be used to fill
	 * the analyzer and the snippetpreview
	 */
	YoastSEO.WordPressScraper.prototype.getData = function() {
		return {
			keyword: this.getDataFromInput( 'keyword' ),
			meta: this.getDataFromInput( 'meta' ),
			text: this.getDataFromInput( 'text' ),
			pageTitle: this.getDataFromInput( 'pageTitle' ),
			title: this.getDataFromInput( 'title' ),
			url: this.getDataFromInput( 'url' ),
			baseUrl: this.getDataFromInput( 'baseUrl' ),
			excerpt: this.getDataFromInput( 'excerpt' ),
			snippetTitle: this.getDataFromInput( 'snippetTitle' ),
			snippetMeta: this.getDataFromInput( 'meta' ),
			snippetCite: this.getDataFromInput( 'cite' )
		};
	};

	/**
	 * gets the values from the given input. Returns this value
	 * @param {String} inputType
	 * @returns {String}
	 */
	YoastSEO.WordPressScraper.prototype.getDataFromInput = function( inputType ) {
		var val = '';
		switch ( inputType ) {
			case 'text':
			case 'content':
				val = this.getContentTinyMCE();
				break;
			case 'url':
				if ( document.getElementById( 'sample-permalink' ) !== null ) {
					val = document.getElementById( 'sample-permalink' ).textContent;
				}
				break;
			case 'baseUrl':
				val = wpseoMetaboxL10n.home_url.replace( /https?:\/\//ig, '' );
				break;
			case 'cite':
			case 'post_name':
				val = document.getElementById( 'post_name' ).value;
				break;
			case 'meta':
				val = document.getElementById( 'yoast_wpseo_metadesc' ).value;
				break;
			case 'keyword':
				val = document.getElementById( 'yoast_wpseo_focuskw' ).value;
				break;
			case 'title':
			case 'snippetTitle':
				val = document.getElementById( 'yoast_wpseo_title' ).value;
				break;
			case 'pageTitle':
				val = document.getElementById( 'yoast_wpseo_title' ).value;
				if ( val === '' ) {
					val = document.getElementById( 'title' ).value;
				}
				break;
			case 'excerpt':
				if ( document.getElementById( 'excerpt' ) !== null ) {
					val = document.getElementById('excerpt').value;
				}
				break;
			default:
				break;
		}
		return val;
	};

	/**
	 * When the snippet is updated, update the (hidden) fields on the page
	 * @param {Object} value
	 * @param {String} type
	 */
	YoastSEO.WordPressScraper.prototype.setDataFromSnippet = function( value, type ) {
		switch ( type ) {
			case 'snippet_meta':
				document.getElementById( 'yoast_wpseo_metadesc' ).value = value;
				break;
			case 'snippet_cite':
				document.getElementById( 'post_name' ).value = value;
				if ( document.getElementById( 'editable-post-name' ) !== null ) {
					document.getElementById( 'editable-post-name' ).textContent = value;
					document.getElementById( 'editable-post-name-full' ).textContent = value;
				}
				break;
			case 'snippet_title':
				document.getElementById( 'yoast_wpseo_title' ).value = value;
				break;
			default:
				break;
		}
	};

	/**
	 * gets content from the content field, if tinyMCE is initialized, use the getContent function to get the data from tinyMCE
	 * @returns {String}
	 */
	YoastSEO.WordPressScraper.prototype.getContentTinyMCE = function() {
		var val = document.getElementById( 'content' ).value;
		if ( tinyMCE.editors.length !== 0 ) {
			val = tinyMCE.get( 'content' ).getContent();
		}
		return val;
	};

	/**
	 * Calls the eventbinders.
	 */
	YoastSEO.WordPressScraper.prototype.bindElementEvents = function( app ) {
		this.snippetPreviewEventBinder( app.snippetPreview );
		this.inputElementEventBinder( app );
		document.getElementById( 'yoast_wpseo_focuskw' ).addEventListener( 'keydown', app.snippetPreview.disableEnter );
	};

	/**
	 * binds the getinputfieldsdata to the snippetelements.
	 *
	 * @param {YoastSEO.SnippetPreview} snippetPreview The snippet preview object to bind the events on.
	 */
	YoastSEO.WordPressScraper.prototype.snippetPreviewEventBinder = function( snippetPreview ) {
		var elems = [ 'snippet_meta', 'snippet_title', 'snippet_cite' ];

		for ( var i = 0; i < elems.length; i++ ) {
			this.bindSnippetEvents( document.getElementById( elems [ i ] ), snippetPreview );
		}
	};

	/**
	 * binds the snippetEvents to a snippet element.
	 * @param { HTMLElement } elem snippet_meta, snippet_title, snippet_cite
	 * @param { YoastSEO.SnippetPreview } snippetPreview
	 */
	YoastSEO.WordPressScraper.prototype.bindSnippetEvents = function( elem, snippetPreview ) {
		elem.addEventListener( 'keydown', snippetPreview.disableEnter.bind( snippetPreview ) );
		elem.addEventListener( 'blur', snippetPreview.checkTextLength.bind( snippetPreview ) );
		//textFeedback is given on input (when user types or pastests), but also on focus. If a string that is too long is being recalled
		//from the saved values, it gets the correct classname right away.
		elem.addEventListener( 'input', snippetPreview.textFeedback.bind( snippetPreview ) );
		elem.addEventListener( 'focus', snippetPreview.textFeedback.bind( snippetPreview ) );
		//shows edit icon by hovering over element
		elem.addEventListener( 'mouseover', snippetPreview.showEditIcon.bind( snippetPreview ) );
		//hides the edit icon onmouseout, on focus and on keyup. If user clicks or types AND moves his mouse, the edit icon could return while editting
		//by binding to these 3 events
		elem.addEventListener( 'mouseout', snippetPreview.hideEditIcon.bind( snippetPreview ) );
		elem.addEventListener( 'focus', snippetPreview.hideEditIcon.bind( snippetPreview ) );
		elem.addEventListener( 'keyup', snippetPreview.hideEditIcon.bind( snippetPreview ) );

		elem.addEventListener( 'focus', snippetPreview.getUnformattedText.bind( snippetPreview ) );
		elem.addEventListener( 'keyup', snippetPreview.setUnformattedText.bind( snippetPreview ) );
		elem.addEventListener( 'click', snippetPreview.setFocus.bind( snippetPreview ) );

		//adds the showIcon class to show the editIcon;
		elem.className = elem.className + ' showIcon' ;
	};

	/**
	 * binds the renewData function on the change of inputelements.
	 */
	YoastSEO.WordPressScraper.prototype.inputElementEventBinder = function( app ) {
		var elems = [ 'excerpt', 'content', 'yoast_wpseo_focuskw', 'title' ];
		for ( var i = 0; i < elems.length; i++ ) {
			var elem = document.getElementById( elems[ i ] );
			if ( elem !== null ) {
				document.getElementById( elems[ i ] ).addEventListener( 'input', app.analyzeTimer.bind( app ) );
			}
		}

		tinyMCE.on( 'addEditor', function(e) {
			e.editor.on( 'keyPress', function() {
				app.analyzeTimer.call( app );
			} );
		});

		document.getElementById( 'yoast_wpseo_focuskw' ).addEventListener( 'blur', this.resetQueue );
	};

	/**
	 * Resets the current queue if focus keyword is changed and not empty.
	 */
	YoastSEO.WordPressScraper.prototype.resetQueue = function() {
		if ( YoastSEO.app.rawData.keyword !== '' ) {
			YoastSEO.app.runAnalyzer( this.rawData );
		}
	};

	/**
	 * Updates the snippet values, is bound by the loader when generating the elements for the snippet.
	 * Uses the unformattedText object of the if the textFeedback function has put a string there (if text was too long).
	 * clears this after use.
	 *
	 * @param {Object} ev
	 */
	YoastSEO.WordPressScraper.prototype.updateSnippetValues = function( ev ) {
		var dataFromSnippet = ev.currentTarget.textContent;
		var currentElement = ev.currentTarget.id;
		if ( typeof YoastSEO.app.snippetPreview.unformattedText[ currentElement ] !== 'undefined' ) {
			ev.currentTarget.textContent = YoastSEO.app.snippetPreview.unformattedText[ currentElement ];
		}
		this.setDataFromSnippet( dataFromSnippet, ev.currentTarget.id );
		YoastSEO.app.refresh();
	};

	/**
	 * Saves the score to the linkdex.
	 * Outputs the score in the overall target.
	 *
	 * @param {String} score
	 */
	YoastSEO.WordPressScraper.prototype.saveScores = function( score ) {
		var tmpl =  wp.template('score_svg');
		document.getElementById( YoastSEO.analyzerArgs.targets.overall ).innerHTML = tmpl();
		document.getElementById( 'yoast_wpseo_linkdex' ).value = score;
	};

	/**
	 * binds to the WordPress jQuery function to put the permalink on the page.
	 * If the response matches with permalinkstring, the snippet can be rerendered.
	 */
	jQuery( document ).on( 'ajaxComplete', function( ev, response ) {
		if ( response.responseText.match( 'Permalink:' ) !== null ) {
			YoastSEO.app.callbacks.getData();
			YoastSEO.app.runAnalyzer();
			YoastSEO.app.snippetPreview.reRender();
		}
	} );
}());