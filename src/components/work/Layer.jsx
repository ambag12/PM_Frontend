import { createPortal } from 'react-dom';
import '../../styles/work.css';

/*
 * Renders children into <body> above any open drawer, so modals / nested drawers opened
 * from inside a drawer are not clipped or stacked underneath it.
 */
const Layer = ({ children }) => createPortal(<div className="work-layer">{children}</div>, document.body);

export default Layer;
