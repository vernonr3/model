import React, {FC, useMemo, useState} from "react";
import {getZoom, getZoomAuto, GraphData, setZoom} from "./graph-view/graph";
import {Graph} from "./graph-view/graph-react";
import {BrowserRouter as Router, Route} from 'react-router-dom'
import {useHistory} from "react-router";
import {listViews, parseView, ViewsList} from "./parseModel";
import {findShortcut, HELP, Help} from "./shortcuts";


export const Root: FC<{model: any, layout: any}> = ({model, layout}) => <Router>
	<Route path="/" component={() => <ModelPane key={getCrtID()} model={model} layouts={layout}/>}/>
</Router>

const getCrtID = () => {
	const p = new URLSearchParams(document.location.search)
	return p.get('id') || ''
}

const DomainSelect: FC<{ views: ViewsList; crtID: string}> = ({views, crtID}) => {
	const history = useHistory();
	return <select
		onChange={e => history.push('?id=' + encodeURIComponent(e.target.value))} value={crtID}>
		<option disabled value="" hidden>...</option>
		{views.map(m => <option key={m.key} value={m.key}>{camelToWords(m.section) + ': ' + m.title}</option>)}
	</select>
}

// we keep graphs here, in case they are edited but not saved
const graphs: {[key: string]: GraphData} = {}
export const refreshGraph = () => {
	delete graphs[getCrtID()]
}

let toggHelp: () => void
window.addEventListener('keydown', e => {
	if (toggHelp && findShortcut(e) == HELP) {
		toggHelp()
	}
})

const ModelPane: FC<{model: any, layouts: any}> = ({model, layouts}) => {
	const crtID = getCrtID()
	const [saving, setSaving] = useState(false)
	const [helpOn, setHelpOn] = useState(false)

	const graph = graphs[crtID] || parseView(model, layouts, crtID)
	if (!graph) {
		const lst = listViews(model)
		document.location.href = '?id=' + lst[0].key
		return <>Redirecting to {lst[0].title}</>
	}
	graphs[crtID] = graph

	function saveLayout() {
		setSaving(true)

		fetch('data/save?id=' + encodeURIComponent(crtID), {
			method: 'post',
			body: JSON.stringify({
				layout: graph.exportLayout(),
				svg: graph.exportSVG()
			})
		}).then(ret => {
			if (ret.status != 202) {
				alert('Error saving')
			}
			setSaving(false)
		})
	}

	toggHelp = () => setHelpOn(!helpOn)

	return <>
		<div className="toolbar">
			<div>
				View: <DomainSelect views={listViews(model)} crtID={crtID}/>
			</div>
			<div>
				<button onClick={() => graph.undo()} title="Undo last change">Undo</button>
				<button className="grp" onClick={() => graph.redo()} title="Redo undone actions">Redo</button>

				<button onClick={() => graph.alignSelectionH()} title="Align selected objects horizontally">H Align</button>
				<button className="grp" onClick={() => graph.alignSelectionV()} title="Align selected objects vertically">V Align</button>
				<button className="grp" onClick={() => graph.autoLayout()} title="Automatic layout using DagreJS">Auto Layout</button>
				<button onClick={() => setZoom(getZoom() - .05)} title="Zoom out">Zoom -</button>
				<button onClick={() => setZoom(getZoom() + .05)} title="Zoom in">Zoom +</button>
				<button onClick={() => {
					graph.alignTopLeft()
					setZoom(getZoomAuto())
				}} title="Zoom/Move to make all graph visible">Fit</button>
				<button onClick={() => setZoom(1)}>Zoom 100%</button>
				<button className="action" disabled={saving} onClick={() => saveLayout()}>Save View</button>
				<button onClick={() => setHelpOn(!helpOn)}>Help</button>
			</div>
		</div>
		<Graph key={crtID}
			   data={graph}
			   // print metadata in console
			   onSelect={id => id && console.log(removeEmptyProps(graph.metadata.elements.find((m: any) => m.id == id)))}
			/>
		{helpOn && <Help/>}
	</>
}

function removeEmptyProps(o: any) {
	return JSON.parse(JSON.stringify(o))
}

function camelToWords(camel: string) {
	let split = camel.replace( /([A-Z])/g, " $1" );
	return split.charAt(0).toUpperCase() + split.slice(1);
}