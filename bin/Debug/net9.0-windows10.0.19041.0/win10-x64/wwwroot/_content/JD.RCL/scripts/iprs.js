
class JDTable {
    constructor(id, element, columns, dotNetObjectReference) {
        this.id = id;
        this.element = element;
        this.columns = columns;
        this.dotNetHelper = dotNetObjectReference;
        this.positionToTake;
        this.selectedColumn;
        this.repositionSpacing = 90;
        this.mousePositionRelativeToTable;
    }

    setColumnBounds() {
        var leftIncrementer = 0;
        this.columns
            .sort((a, b) => a.position - b.position) // Sort by position
            .forEach(column => {                
                column.left = leftIncrementer;
                column.width = column.element.offsetWidth;
                column.right = column.left + column.width;
                column.element.style.left = `${column.left}px`;
                column.element.style.width = `${column.width}px`;
                column.element.style.zIndex = column.position + 1;
                leftIncrementer += column.width;
            });
    }

    handleColumnWidthChanging(diffX) {
        this.columns.forEach(column => {
            if (column.left > this.selectedColumn.left) {
                column.element.style.left = `${column.left + diffX}px`;
            }
        });
    }

    handleColumnPositionChanging() {
        const getPositionToTake = () => {
            const columnBeingIntersected = this.columns.find(column => column.intersectsWithPoint(this.mousePositionRelativeToTable));
            if (!columnBeingIntersected) return undefined;
            return columnBeingIntersected.position;
        };
        const adjustColumnPositionsExcludingSelected = () => {
            this.columns
                .filter(column => column.id !== this.selectedColumn.id)
                .forEach(filteredColumn => {
                    const offset = filteredColumn.calculateOffset(this.positionToTake, this.selectedColumn, this.repositionSpacing);
                    filteredColumn.element.style.left = `${filteredColumn.left + offset}px`;
                });
        };
        this.positionToTake = getPositionToTake();
        if (this.positionToTake === undefined)
            this.positionToTake = this.selectedColumn.position;

        adjustColumnPositionsExcludingSelected();
    }

    updateColumnPositions() {
        this.selectedColumn.left = this.selectedColumn.element.offsetLeft;
        let filteredColumns = this.columns.filter(column => column.id !== this.selectedColumn.id);
        
        filteredColumns.forEach(column => {
            if (this.positionToTake < this.selectedColumn.position) {
                if (column.position >= this.positionToTake && column.position < this.selectedColumn.position) {
                    column.position++;
                }
            } else if (this.positionToTake > this.selectedColumn.position) {
                if (column.position <= this.positionToTake && column.position > this.selectedColumn.position) {
                    column.position--;
                }
            }
        });
        if (this.positionToTake === undefined) {
            return;
        }
        this.selectedColumn.position = this.positionToTake;
        
    }

    enableColumnTransitionsExceptSelected() {
        this.columns.forEach(column => {
            if (column.id !== this.selectedColumn.id) {
                column.element.style.transition = 'ease 0.2s';
            }
        });
    }

    disableTransitionsExceptSelected() {
        this.columns.forEach(column => {
            if (column.id !== this.selectedColumn.id) {
                column.element.style.transition = '';
            }
        });
    }
}

class JDColumn {
    constructor({ id, element }) {
        this.id = id;
        this.element = element;
        this.header = document.getElementById(`${id}-header`);
        this.headerText = document.getElementById(`${id}-header-text`);
        this.headerFilterSortContainer = document.getElementById(`${id}-header-filtersort-container`);
        this.headerFilterContainer = document.getElementById(`${id}-header-filter-container`);
        this.left = 0;
        this.right = 0;
        this.width = 0;
        this.position = parseInt(id.split("-")[0]);
    }

    intersectsWithPoint(xValue) {
        return (xValue >= this.left && xValue <= this.right);
    }

    setRepositioningStyling() {
        const pixelAmount = -10;
        const originalWidth = this.element.offsetWidth;
        const originalHeight = this.element.offsetHeight;
        const scaleX = (originalWidth + pixelAmount) / originalWidth;
        const scaleY = (originalHeight + pixelAmount) / originalHeight;
        this.element.style.transform = `scale(${scaleX}, ${scaleY})`;
        this.element.style.opacity = '0.8';
        this.element.style.zIndex = '1000';
    }

    removeRepositioningStyling() {
        this.element.style.transform = '';
        this.element.style.opacity = '';
        this.element.style.zIndex = '';
    }

    calculateOffset(positionToTake, selectedColumn, positionSetSpacing) {
        if (positionToTake < selectedColumn.position) {
            if (positionToTake === this.position ||
                (positionToTake < this.position && selectedColumn.position > this.position)) {
                return positionSetSpacing;
            }
        } else if (positionToTake > selectedColumn.position) {
            if (positionToTake === this.position ||
                (positionToTake > this.position && selectedColumn.position < this.position)) {
                return -positionSetSpacing;
            }
        }
        return 0;
    }

    getMousePositionRelativeToTable(currentX, diffX) {
        return currentX - (this.element.getBoundingClientRect().left - (this.left + diffX)); 
    }
}

window.JDTables = {};

window.registerTable = function (id, dotNetObjectReference) {
    const jDTableElement = document.getElementById(id);
    if (!jDTableElement) {
        console.warn(`Element with id ${id} not found.`);
        return;
    }
    const columns = [];
    // Iterate over direct children that are div elements
    Array.from(jDTableElement.children).forEach(child => {
        if (child.tagName === 'DIV') {
            const column = new JDColumn({ id: child.id, element: child });
            columns.push(column);

            const onMouseDown = (event) => {
                let startX = event.clientX;
                const resizeAreaWidth = 10;
                const columnHeaderRect = column.header.getBoundingClientRect();
                const initialColumnWidth = column.element.offsetWidth;
                const isAdjustingColumnWIdth = columnHeaderRect.right - event.clientX < resizeAreaWidth;
                window.JDTables[id].selectedColumn = column;
                window.JDTables[id].positionToTake = undefined;
                if (isAdjustingColumnWIdth) {
                    column.element.style.userSelect = 'none';
                } else {
                    window.JDTables[id].enableColumnTransitionsExceptSelected();
                }

                const onMouseMove = (event) => {
                    const diffX = event.clientX - startX;
                    column.headerFilterSortContainer.style.pointerEvents = 'none';
                    if (isAdjustingColumnWIdth) {
                        column.width = initialColumnWidth + diffX;
                        column.element.style.width = `${column.width}px`;
                        window.JDTables[id].handleColumnWidthChanging(diffX);
                    } else if (!isAdjustingColumnWIdth) {
                        column.element.style.left = `${column.left + diffX}px`;
                        column.setRepositioningStyling();
                        window.JDTables[id].mousePositionRelativeToTable = column.getMousePositionRelativeToTable(event.clientX, diffX);
                        window.JDTables[id].handleColumnPositionChanging();
                    }
                };

                const onMouseUp = () => {
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                    column.removeRepositioningStyling();
                    if (!isAdjustingColumnWIdth) {
                        window.JDTables[id].disableTransitionsExceptSelected();
                        window.JDTables[id].updateColumnPositions();
                        //let columns = window.JDTables[id].columns.map(column => ({
                        //    header: column.headerText ? column.headerText.textContent : "", // Or null if you want it nullable
                        //    preference: `${column.position}`
                        //}));
                        //let json = JSON.stringify(columns);
                        //window.JDTables[id].dotNetHelper.invokeMethodAsync('UpdateColumnPreferences', 'Position', json)
                        //    .catch(err => console.error(err));
                    }
                    if (isAdjustingColumnWIdth) {
                        //let columns = window.JDTables[id].columns.map(column => ({
                        //    header: column.headerText ? column.headerText.textContent : "", // Or null if you want it nullable
                        //    preference: `${column.width}px`
                        //}));
                        //let json = JSON.stringify(columns);
                        //window.JDTables[id].dotNetHelper.invokeMethodAsync('UpdateColumnPreferences', 'Width', json)
                        //    .catch(err => console.error(err));
                    }
                    column.headerFilterSortContainer.style.pointerEvents = '';
                    window.JDTables[id].setColumnBounds();
                };

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            };

            const onFilterMouseUp = () => {
                if (column.width < 175) {
                    column.element.style.width = `175px`;
                    window.JDTables[id].setColumnBounds();
                }
            };

            if (column.element) {
                column.header.addEventListener('mousedown', (event) => { onMouseDown(event); });
                column.headerFilterContainer.addEventListener('mouseup', (event) => { onFilterMouseUp(); });
            } else {
                console.warn(`Column element with id ${child.id} is undefined.`);
            }
        }
    });
    const jDTable = new JDTable(id, jDTableElement, columns, dotNetObjectReference);
    window.JDTables[id] = jDTable;
    window.JDTables[id].setColumnBounds(); 
};

class ClickOutOfElement {
    constructor({ id, element, clickOutOf, dotNetHelper, keepOpen }) {
        this.id = id;
        this.element = element;
        this.clickOutOf = clickOutOf;
        this.dotNetHelper = dotNetHelper;
        this.keepExpandedIfClickedInside = keepOpen;
    }
    makeCollapsed() {
        if (this.element.classList.contains('expanded')) {
            this.element.classList.remove('expanded');
        }
        if (!this.element.classList.contains('collapsed')) {
            this.element.classList.add('collapsed');
        }
    }
    setNewState(newState) {
        this.element.classList.remove('expanded');
        this.element.classList.remove('collapsed');
        this.element.classList.add(newState);
    }
    toggleState() {
        if (this.element.classList.contains('expanded')) {
            this.element.classList.remove('expanded');
            this.element.classList.add('collapsed');
        } else {
            this.element.classList.remove('collapsed');
            this.element.classList.add('expanded');
        }
    }
    updateStateServiceCollapsedState() {
        if (window.registeredClickOutOfElements[this.element.id]) {
            window.registeredClickOutOfElements[this.element.id].dotNetHelper.invokeMethodAsync('UpdateUIState', 'Collapsed').catch(err => console.error(err));
        }
    }
}

window.registeredClickOutOfElements = {};

window.registerClickOutOfElements = function (dto) {
    // Create a new instance of ClickOutOfElement
    const clickOutOfElement = new ClickOutOfElement({
        id: dto.id,
        element: document.getElementById(dto.id),
        clickOutOf: dto.clickOutOf,
        dotNetHelper: dto.dotNetObjectReference,
        keepOpen: dto.keepOpen
    });
    // Perform validation checks and log errors if necessary
    if (!clickOutOfElement.id) { throw new Error(`Id failed to set with ${dto.id}.`); }
    if (!clickOutOfElement.clickOutOf) { throw new Error(`ClickOutOf failed to set with ${dto.clickOutOf}.`); }
    if (!clickOutOfElement.dotNetHelper) { throw new Error(`DotNetHelper failed to set with ${dto.dotNetObjectReference}.`); }
    if (!clickOutOfElement.element) { throw new Error(`Element with id ${dto.id} not found.`); }
    // Register the element only if it hasn't been registered before
    if (!window.registeredClickOutOfElements[dto.id])
        window.registeredClickOutOfElements[dto.id] = clickOutOfElement;
};
window.setElementUIState = function (elementId, newState) {
    var element = document.getElementById(elementId);
    if (element) {
        element.setNewState(newState);
    }
};
document.addEventListener('click', function (event) {
    const idSuffix = 'coo';
    const selector = `[id$="${idSuffix}"]`;
    window.clickOutOfElements = document.querySelectorAll(selector);

    // Find all "coo" elements that contain the clicked target
    const clickedInsideElements = Array.from(window.clickOutOfElements).filter(el => el.contains(event.target));

    if (clickedInsideElements.length === 0) {
        // Clicked outside of all coo elements
        window.clickOutOfElements.forEach(domElement => {
            const clickOutOfElement = window.registeredClickOutOfElements[domElement.id];
            if (clickOutOfElement) {
                clickOutOfElement.makeCollapsed();
                clickOutOfElement.updateStateServiceCollapsedState();
            }
        });
    } else {
        // We clicked inside at least one "coo" element
        // The innermost clicked element is the last in the array
        const topClickedElement = clickedInsideElements[clickedInsideElements.length - 1];

        window.clickOutOfElements.forEach(domElement => {
            const clickOutOfElement = window.registeredClickOutOfElements[domElement.id];
            if (!clickOutOfElement) return;

            if (clickedInsideElements.includes(domElement)) {
                // This element is in the chain of clicked elements (either the innermost or a parent)
                if (domElement === topClickedElement) {
                    // This is the actual element clicked or its closest coo ancestor
                    // Check if it is already expanded
                    if (!topClickedElement.classList.contains('expanded')) {
                        clickOutOfElement.toggleState();
                    } else if (topClickedElement.classList.contains('expanded') && !clickOutOfElement.keepExpandedIfClickedInside) {
                        clickOutOfElement.makeCollapsed();
                        clickOutOfElement.updateStateServiceCollapsedState();
                    }
                } else {
                    // This is a parent coo element. Keep it expanded (do nothing).
                    // Because we don't want the parent to collapse if we clicked inside a nested coo.
                }
            } else {
                // This coo element is not part of the clicked chain, so collapse it.
                clickOutOfElement.makeCollapsed();
                clickOutOfElement.updateStateServiceCollapsedState();
            }
        });
    }
});






class ContainingDiv {
    constructor(id, bounds, panels) {
        this.id = id;
        this.bounds = bounds;
        this.panels = panels;
        this.detachable = false;
        this.bodyElement = document.getElementById(`${id}-body`);
        this.bodyTopOffset = 0;
    }
}
class JDPanel {
    constructor({ id, panelElement, dotNetHelper, type, latchingType, container, stateChanger, minLatchingWidth, latching, size, state, sElement1, sElement2, centerElementContainer, sElementContainer1, sElementContainer2, centerElement, pushExpand }) {
        this.id = id;
        this.element = panelElement;
        this.container = container;
        this.stateChanger = stateChanger;
        this.type = type;
        this.latchingType = latchingType;
        this.dotNetHelper = dotNetHelper;
        this.minLatchingWidth = minLatchingWidth;
        this.latching = latching;
        this.size = size;
        this.state = state;
        this.sElement1 = sElement1;
        this.sElement2 = sElement2;
        this.sElementContainer1 = sElementContainer1;
        this.sElementContainer2 = sElementContainer2;
        this.centerElementContainer = centerElementContainer;
        this.centerElement = centerElement;
        this.isFocused = false;
        this.wasFocused1 = false;
        this.wasFocused2 = false;
        this.wasFocused3 = false;
        this.clickOrder = 0;
        this.pushExpand = pushExpand;
    }

    disableTransitions() {
        this.stateChanger.style.transition = 'none';
        this.element.style.transition = 'none';
        this.container.style.transition = 'none';
    }

    enableTransitions() {
        this.stateChanger.style.transition = '';
        this.element.style.transition = '';
        this.container.style.transition = '';
    }

    makeExpanded() {
        if (this.stateChanger.classList.contains('minimized')) this.stateChanger.classList.remove('minimized');
        if (this.container.classList.contains('minimized')) this.container.classList.remove('minimized');
        if (this.element.classList.contains('minimized')) this.element.classList.remove('minimized');
        this.stateChanger.classList.add('expanded');
        this.container.classList.add('expanded');
        this.element.classList.add('expanded');
        this.state = 'Expanded';
        this.dotNetHelper.invokeMethodAsync('UpdateStateServicePanelState', this.state).catch(err => console.error(err));
    }

    makeMinimized() {
        if (this.stateChanger.classList.contains('expanded')) this.stateChanger.classList.remove('expanded');
        if (this.container.classList.contains('expanded')) this.container.classList.remove('expanded');
        if (this.element.classList.contains('expanded')) this.element.classList.remove('expanded');
        this.stateChanger.classList.add('minimized');
        this.container.classList.add('minimized');
        this.element.classList.add('minimized');
        this.state = 'Collapsed';
        this.dotNetHelper.invokeMethodAsync('UpdateStateServicePanelState', this.state).catch(err => console.error(err));
    }

    setPanelStatechangerElementClasses(containingDivId) {
        if (this) {
            if (this.latching) {
                if (this.latchingType === 'Vertical') {
                    if (!this.container.classList.contains('latching')) this.container.classList.add('latching');
                    if (!this.stateChanger.classList.contains('latching')) this.stateChanger.classList.add('latching');
                    if (!this.stateChanger.classList.contains('vertical')) this.stateChanger.classList.add('vertical');
                    if (!this.centerElement.classList.contains('dots')) this.centerElement.classList.add('dots');
                    if (!this.centerElementContainer.classList.contains('dots')) this.centerElementContainer.classList.add('dots');
                    if (!this.sElement1.classList.contains('detacher')) this.sElement1.classList.add('detacher');
                    if (!this.sElement2.classList.contains('detacher')) this.sElement2.classList.add('detacher');
                    if (this.centerElement.classList.contains('arrow')) this.centerElement.classList.remove('arrow');
                    if (this.centerElementContainer.classList.contains('arrow')) this.centerElementContainer.classList.remove('arrow');
                    if (this.sElement1.classList.contains('dots')) this.sElement1.classList.remove('dots');
                    if (this.sElement2.classList.contains('dots')) this.sElement2.classList.remove('dots');
                    if (window.ContainingDivs[containingDivId].detachable) {
                        this.sElement1.style.display = "";
                        this.sElement2.style.display = "";
                    } else {
                        this.sElement1.style.display = "none";
                        this.sElement2.style.display = "none";
                    }
                }
            }
            else {
                if (this.container.classList.contains('latching')) this.container.classList.remove('latching');
                if (this.stateChanger.classList.contains('latching')) this.stateChanger.classList.remove('latching');
                if (this.stateChanger.classList.contains('vertical')) this.stateChanger.classList.remove('vertical');
                if (!this.centerElement.classList.contains('arrow')) this.centerElement.classList.add('arrow');
                if (!this.centerElementContainer.classList.contains('arrow')) this.centerElementContainer.classList.add('arrow');
                if (!this.sElement1.classList.contains('dots')) this.sElement1.classList.add('dots');
                if (!this.sElement2.classList.contains('dots')) this.sElement2.classList.add('dots');
                if (this.centerElementContainer.classList.contains('dots')) this.centerElementContainer.classList.remove('dots');
                if (this.centerElement.classList.contains('dots')) this.centerElement.classList.remove('dots');
                if (this.sElement1.classList.contains('detacher')) this.sElement1.classList.remove('detacher');
                if (this.sElement2.classList.contains('detacher')) this.sElement2.classList.remove('detacher');
            }
        }
    }

    setPanelTypeClasses() {
        if (this) {
            let panelType = this.type.toLowerCase();
            if (!this.centerElementContainer.classList.contains(panelType)) this.centerElementContainer.classList.add(panelType)
            if (!this.centerElement.classList.contains(panelType)) this.centerElement.classList.add(panelType)
            if (!this.sElementContainer1.classList.contains(panelType)) this.sElementContainer1.classList.add(panelType)
            if (!this.sElementContainer2.classList.contains(panelType)) this.sElementContainer2.classList.add(panelType)
            if (!this.sElement1.classList.contains(panelType)) this.sElement1.classList.add(panelType)
            if (!this.sElement2.classList.contains(panelType)) this.sElement2.classList.add(panelType)
        }
    }
}

window.ContainingDivs = {};
window.getPanelContainingDivId = function (panelId) {
    const container = document.getElementById(`${panelId}-panel-container`);
    if (!container) {
        throw new Error(`Container with id ${panelId}-panel-container not found.`);
    }

    const panelContainingDiv = container.parentElement;
    if (!panelContainingDiv) {
        throw new Error(`Parent element of container with id ${panelId}-panel-container not found.\nThe containing div of a JDPanel component bust have an id.`);
    }

    const panelContainingDivId = panelContainingDiv.id;
    if (!panelContainingDivId) {
        throw new Error(`Parent element of container with id ${panelId}-panel-container does not have an id.\nThe containing div of a JDPanel component bust have an id.`);
    }
    return panelContainingDivId;
};
window.setContainingDivDetachable = function (containingDivId, detachable) {
    let containingDiv = window.ContainingDivs[containingDivId];
    if (containingDiv) {
        containingDiv.detachable = detachable;
    }
};
window.registerContainingDivAndPanels = function (panelDtos, containingDivId = '', latchingDetachable = false) {
    if (!panelDtos || panelDtos.length === 0) {
        throw new Error(`Panels could not be registered because no panel objects were passed to registerContainingDivAndPanels.`);
    }
    if (!containingDivId) {
        const firstDto = panelDtos[0];
        containingDivId = window.getPanelContainingDivId(firstDto.id);
    }

    // Register ContainingDiv
    if (!window.ContainingDivs[containingDivId]) {
        window.ContainingDivs[containingDivId] = new ContainingDiv(containingDivId, null, []);
        window.ContainingDivs[containingDivId].bounds = getContainingDivElementBounds(containingDivId);
        window.ContainingDivs[containingDivId].bodyTopOffset = getContainingDivBodyTopOffset(containingDivId);
        window.ContainingDivs[containingDivId].detachable = latchingDetachable;
        if (!window.ContainingDivs[containingDivId].bounds) {
            let containingDiv = document.getElementById(containingDivId);
            if (!containingDiv) {
                throw new Error(`ContainingDiv with id: "${containingDivId}" not found.`);
            } else {
                throw new Error(`ContainingDiv with id: "${containingDivId}" does not have bounds.`);
            }
        }
    }
    let justlatched = false;
    // Register Panels
    var panels = [];
    panelDtos.forEach(function (dto) {
        // throw an error if any of the elements are not found
        const panelElement = document.getElementById(`${dto.id}-panel`);
        const container = document.getElementById(`${dto.id}-panel-container`);
        const stateChanger = document.getElementById(`${dto.id}-panel-statechanger`);
        const centerElementContainer = document.getElementById(`${dto.id}-panel-container-center`);
        const centerElement = document.getElementById(`${dto.id}-panel-center`);
        const sElementContainer1 = document.getElementById(`${dto.id}-Selement-container-1`);
        const sElementContainer2 = document.getElementById(`${dto.id}-Selement-container-2`);
        const sElement1 = document.getElementById(`${dto.id}-Selement-1`);
        const sElement2 = document.getElementById(`${dto.id}-Selement-2`);
        if (!panelElement) throw new Error(`Element with id ${dto.id}-panel not found.`);
        if (!container) throw new Error(`Element with id ${dto.id}-panel-container not found.`);
        if (!stateChanger) throw new Error(`Element with id ${dto.id}-panel-statechanger not found.`);
        if (!centerElementContainer) throw new Error(`Element with id ${dto.id}-panel-container-center not found.`);
        if (!centerElement) throw new Error(`Element with id ${dto.id}-panel-center not found.`);
        if (!sElementContainer1) throw new Error(`Element with id ${dto.id}-Selement-container-1 not found.`);
        if (!sElementContainer2) throw new Error(`Element with id ${dto.id}-Selement-container-2 not found.`);
        if (!sElement1) throw new Error(`Element with id ${dto.id}-Selement-1 not found.`);
        if (!sElement2) throw new Error(`Element with id ${dto.id}-Selement-2 not found.`);
        const panel = new JDPanel({
            id: dto.id,
            panelElement: panelElement,
            dotNetHelper: dto.dotNetObjectReference,
            type: dto.docked,
            latchingType: dto.latchingType,
            container: container,
            stateChanger: stateChanger,
            minLatchingWidth: dto.minLatchingWidth,
            latching: dto.latching,
            size: dto.size,
            state: dto.state,
            sElement1: sElement1,
            sElement2: sElement2,
            centerElementContainer: centerElementContainer,
            sElementContainer1: sElementContainer1,
            sElementContainer2: sElementContainer2,
            centerElement: centerElement,
            pushExpand: dto.pushExpand
        });
        panels.push(panel);

        const onMouseDown = (event) => {
            let startY = event.clientY;
            let startX = event.clientX;
            const initialHieght = panel.element.offsetHeight;
            const initialWidth = panel.element.offsetWidth

            const leftPanel = window.ContainingDivs[containingDivId]?.panels.find(p => p.type === 'Left');
            const rightPanel = window.ContainingDivs[containingDivId]?.panels.find(p => p.type === 'Right');
            const topPanel = window.ContainingDivs[containingDivId]?.panels.find(p => p.type === 'Top');
            const bottomPanel = window.ContainingDivs[containingDivId]?.panels.find(p => p.type === 'Bottom');

            const bodyElement = window.ContainingDivs[containingDivId].bodyElement;

            const bodyInitialHeight = bodyElement?.offsetHeight ?? 0;
            const bodyInitialTop = bodyElement?.offsetTop ?? 0;

            const leftInitialHeight = leftPanel?.element?.offsetHeight ?? 0;
            const rightInitialHeight = rightPanel?.element?.offsetHeight ?? 0;
            const leftInitialTop = leftPanel?.container?.offsetTop ?? 0;
            const rightInitialTop = rightPanel?.container?.offsetTop ?? 0;

            const initialStateChangerLeft = panel.stateChanger.offsetLeft;
            const initialStateChangerTop = panel.stateChanger.offsetTop;
            const myLeftPanel = window.ContainingDivs[containingDivId].panels.find(p => p.type === 'Left');
            const leftPanelInitialWidth = myLeftPanel?.element.offsetWidth;
            let mouseMoved = false;

            if (leftPanel)
                leftPanel.disableTransitions();

            if (rightPanel)
                rightPanel.disableTransitions();

            if (topPanel)
                topPanel.disableTransitions();

            if (bottomPanel)
                bottomPanel.disableTransitions();

            if (bodyElement)
                bodyElement.style.transition = 'none';

            const onMouseMove = (event) => {
                if (panel.state === 'Collapsed')
                    return;

                mouseMoved = true;
                const diffX = event.clientX - startX;
                const diffY = event.clientY - startY;
                if (panel.latching) {
                    if (panel.latchingType === 'Vertical') {
                        if (leftPanel && rightPanel) {
                            // Calculate the new width while respecting the minimum latching width
                            let newLeftPanelWidth = leftPanelInitialWidth + diffX;
                            let newRightPanelWidth = window.ContainingDivs[containingDivId].bounds.width - 20 - newLeftPanelWidth;

                            if (newLeftPanelWidth < leftPanel.minLatchingWidth) {
                                newLeftPanelWidth = leftPanel.minLatchingWidth;
                                newRightPanelWidth = window.ContainingDivs[containingDivId].bounds.width - 20 - newLeftPanelWidth;
                            }

                            if (newRightPanelWidth < rightPanel.minLatchingWidth) {
                                newRightPanelWidth = rightPanel.minLatchingWidth;
                                newLeftPanelWidth = window.ContainingDivs[containingDivId].bounds.width - 20 - newRightPanelWidth;
                            }

                            // Apply the new widths
                            leftPanel.element.style.width = `${newLeftPanelWidth}px`;
                            leftPanel.stateChanger.style.left = `${newLeftPanelWidth}px`;
                            rightPanel.container.style.right = `calc(${window.ContainingDivs[containingDivId].bounds.width - 20}px - ${newLeftPanelWidth}px)`;
                            rightPanel.element.style.width = `calc(${window.ContainingDivs[containingDivId].bounds.width - 20}px - ${newLeftPanelWidth}px)`;
                        }
                    }
                } else {
                    if (panel.type === 'Left') {
                        panel.element.style.width = `${initialWidth + diffX}px`;
                        panel.stateChanger.style.left = `${initialStateChangerLeft + diffX}px`;
                    } else if (panel.type === 'Right') {
                        panel.element.style.width = `${initialWidth - diffX}px`;
                        panel.container.style.right = `${initialWidth - diffX}px`;
                    } else if (panel.type === 'Top') {
                        panel.element.style.height = `${initialHieght + diffY}px`;
                        panel.stateChanger.style.top = `${initialStateChangerTop + diffY}px`;
                        if (panel.pushExpand) {
                            let leftPanel = window.ContainingDivs[containingDivId].panels.find(p => p.type === 'Left');
                            let rightPanel = window.ContainingDivs[containingDivId].panels.find(p => p.type === 'Right');
                            let bodyElement = window.ContainingDivs[containingDivId].bodyElement;
                            if (leftPanel) {
                                leftPanel.element.style.height = `${leftInitialHeight - diffY}px`;
                                leftPanel.stateChanger.style.height = `${leftInitialHeight - diffY}px`;
                                leftPanel.container.style.top = `${leftInitialTop + diffY}px`;
                            }
                            if (rightPanel) {
                                rightPanel.element.style.height = `${rightInitialHeight - diffY}px`;
                                rightPanel.stateChanger.style.height = `${rightInitialHeight - diffY}px`;
                                rightPanel.container.style.top = `${rightInitialTop + diffY}px`;
                            }
                            if (bodyElement) {
                                bodyElement.style.height = `${bodyInitialHeight - diffY}px`;
                                bodyElement.style.top = `${bodyInitialTop + diffY}px`;
                            }
                        }

                    } else if (panel.type === 'Bottom') {
                        panel.element.style.height = `${initialHieght - diffY}px`;
                        panel.container.style.bottom = `${initialHieght - diffY}px`;

                        if (panel.pushExpand) {
                            let bodyElement = window.ContainingDivs[containingDivId].bodyElement;
                            if (leftPanel) {
                                leftPanel.element.style.height = `${leftInitialHeight + diffY}px`;
                                leftPanel.stateChanger.style.height = `${leftInitialHeight + diffY}px`;
                                leftPanel.container.style.bottom = `${leftInitialTop - diffY}px`;
                            }
                            if (rightPanel) {
                                rightPanel.element.style.height = `${rightInitialHeight + diffY}px`;
                                rightPanel.stateChanger.style.height = `${rightInitialHeight + diffY}px`;
                                rightPanel.container.style.bottom = `${rightInitialTop - diffY}px`;
                            }
                            if (bodyElement) {
                                bodyElement.style.height = `${bodyInitialHeight + diffY}px`;
                                bodyElement.style.bottom = `${bodyInitialTop - diffY}px`;
                            }
                        }
                    }
                }
            };

            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);

                if (leftPanel)
                    leftPanel.enableTransitions();

                if (rightPanel)
                    rightPanel.enableTransitions();

                if (topPanel)
                    topPanel.enableTransitions();

                if (bottomPanel)
                    bottomPanel.enableTransitions();

                if (bodyElement)
                    bodyElement.style.transition = '';

                if (panel.latching) {
                    if (panel.latchingType === 'Vertical') {
                        if (leftPanel && rightPanel) {

                            leftPanel.size = `${leftPanel.element.offsetWidth}px`;
                            rightPanel.size = `${rightPanel.element.offsetWidth}px`;
                        }
                    }
                } else {
                    if (!mouseMoved) {
                        if (!justlatched) {
                            toggleUIState(panel);
                        } else {
                            if (panel.latchingType === 'Vertical' && (panel.type === 'Top' || panel.type === 'Bottom')) {
                                toggleUIState(panel);
                            }
                        }
                    }
                    let size = -1;
                    if (panel.type === 'Left' || panel.type === 'Right') {
                        if (!justlatched && panel.latchingType === 'Vertical') {
                            const leftRect = leftPanel.stateChanger.getBoundingClientRect();
                            const rightRect = rightPanel.stateChanger.getBoundingClientRect();
                            // Check if the left panel intersects with the right panel
                            if (leftPanel.stateChanger.offsetLeft + leftRect.width >= rightRect.left
                                && leftRect.left <= rightRect.left + rightRect.width
                                && leftRect.left + leftRect.width >= rightRect.left)
                            {
                                if (leftPanel.state === 'Expanded' && rightPanel.state === 'Expanded') {
                                    leftPanel.size = `${leftPanel.element.offsetWidth}px`;
                                    rightPanel.size = `${rightPanel.element.offsetWidth}px`;
                                    setLatching(leftPanel);
                                    return;
                                }
                            }
                            // Check if the right panel intersects with the left panel
                            else if (rightRect.left <= leftRect.left + leftRect.width
                                && rightRect.left >= leftRect.left
                                && rightRect.left <= leftRect.left + leftRect.width)
                            {
                                if (leftPanel.state === 'Expanded' && rightPanel.state === 'Expanded') {
                                    leftPanel.size = `${leftPanel.element.offsetWidth}px`;
                                    rightPanel.size = `${rightPanel.element.offsetWidth}px`;
                                    setLatching(leftPanel);
                                    return;
                                }
                            }
                        }
                        size = parseFloat(panel.element.style.width);
                        if (size < 50 || size > window.ContainingDivs[containingDivId].bounds.width - 20) {
                            if (panel.type === 'Left') {
                                panel.stateChanger.style.left = panel.size;
                                panel.element.style.width = panel.size;
                            } else {
                                panel.element.style.width = panel.size;
                            }
                            toggleUIState(panel);
                            
                        } else {
                            panel.size = `${size}px`;
                        }
                    } else if (panel.type === 'Top' || panel.type === 'Bottom') {
                        size = parseFloat(panel.element.style.height);
                        if (size < 50 || size > window.ContainingDivs[containingDivId].bounds.height - 20) {
                            if (panel.type === 'Top') {
                                panel.stateChanger.style.top = panel.size;
                                panel.element.style.height = panel.size;
                            } else {
                                panel.element.style.height = panel.size;
                            }
                            toggleUIState(panel);
                        } else {
                            panel.size = `${size}px`;
                        }
                    }
                    justlatched = false;
                }
            };
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };

        if (panel.latching) {
            panel.sElementContainer1.addEventListener('mousedown', () => setNotLatching(panel));
            panel.sElementContainer2.addEventListener('mousedown', () => setNotLatching(panel));
        }
        panel.stateChanger.addEventListener('mousedown', (event) => { onMouseDown(event); });
        panel.element.addEventListener('mousedown', () => setFocusPanelOrder(panel));
        
    });

    window.ContainingDivs[containingDivId].panels = panels;
    window.setPanelUIState = function (myContainingDivId, panelId, desiredState) {
        const panel = window.ContainingDivs[myContainingDivId].panels.find(p => p.id === panelId);
        if (panel) {
            toggleUIState(panel, desiredState);
        }
    };
    function toggleUIState(panel, desiredState) {
        if (panel.latching)
            return;

        if (desiredState) {
            if (desiredState === 'Expanded') {
                panel.makeExpanded();
                
            } else {
                panel.makeMinimized();
            }
        } else {
            if (panel.state === 'Expanded') {
                panel.makeMinimized();
            }
            else {
                panel.makeExpanded();
            }
        }
        setFocusPanelOrder(panel);
    }
    function getContainingDivElementBounds(elementId) {
        const element = document.getElementById(elementId);
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        return {
            top: rect.top + window.scrollY,
            left: rect.left + window.scrollX,
            right: rect.right + window.scrollX,
            bottom: rect.bottom + window.scrollY,
            width: rect.width,
            height: rect.height,
        };
    }
    function getContainingDivBodyTopOffset(elementId) {
        var headerElement = document.getElementById(`${elementId}-header`);
        var footerElement = document.getElementById(`${elementId}-footer`);
        var offset = 0;
        if (headerElement) 
            offset += 56;

        if (footerElement)
            offset += 56;

        return offset;
    }
    function getVerticalHeightOffsets(panel = null) {
        var offset = 0;
        var bottomPanel = window.ContainingDivs[containingDivId].panels.find(p => p.type === 'Bottom');
        var topPanel = window.ContainingDivs[containingDivId].panels.find(p => p.type === 'Top');
        if (panel && panel.latching) {
            offset = -20;
        } else {
            if (topPanel && bottomPanel && (topPanel.pushExpand || bottomPanel.pushExpand)) {
                if (topPanel.pushExpand && bottomPanel.pushExpand) {
                    offset = -20;
                } else {
                    offset = -10;
                    if (topPanel.pushExpand && bottomPanel.state === 'Collapsed') {
                        offset -= 10;
                    }
                    if (bottomPanel.pushExpand && topPanel.state === 'Collapsed') {
                        offset -= 10;
                    }
                }
            } else {
                if (bottomPanel && bottomPanel.state === 'Expanded' && topPanel && topPanel.state === 'Expanded')
                    offset = 0;

                if (bottomPanel && bottomPanel.state === 'Collapsed' && topPanel && topPanel.state === 'Collapsed')
                    offset = -20;

                if (bottomPanel && bottomPanel.state === 'Collapsed' && topPanel && topPanel.state === 'Expanded')
                    offset = -10;

                if (bottomPanel && bottomPanel.state === 'Expanded' && topPanel && (topPanel.state === 'Collapsed'))
                    offset = -10;
            }
            // adjust for possible border widths
            const computedStyle = window.getComputedStyle(document.getElementById(window.ContainingDivs[containingDivId].id));
            const containingDivBorderBottomWidth = computedStyle.borderBottomWidth;
            const containingDivBorderTopWidth = computedStyle.borderTopWidth;
            if (containingDivBorderBottomWidth) {
                offset -= parseFloat(containingDivBorderBottomWidth);
            }
            if (containingDivBorderTopWidth) {
                offset -= parseFloat(containingDivBorderTopWidth);
            }
        }

        if (topPanel && topPanel.pushExpand && topPanel.state === 'Expanded') {
            offset -= parseFloat(topPanel.size);
        }

        if (bottomPanel && bottomPanel.pushExpand && bottomPanel.state === 'Expanded') {
            offset -= parseFloat(bottomPanel.size);
        }

        return offset;
    }
    function getHorizontalWidthOffsets(panel = null) {
        var offset = 0;
        if (panel && panel.state === 'Expanded') {
            offset = 0;
        }
        if (panel && panel.state === 'Collapsed') {
            offset = 0;
        }

        return offset;
    }
    function getVerticalTopOffsets(panel = null) {
        var bottomPanel = window.ContainingDivs[containingDivId].panels.find(p => p.type === 'Bottom');
        var topPanel = window.ContainingDivs[containingDivId].panels.find(p => p.type === 'Top');
        var offset = 0;
        if (panel && panel.latching) {
            offset = 10;
        } else {
            if (topPanel.pushExpand) {
                offset = 10;
            } else {
                if (bottomPanel && bottomPanel.state === 'Expanded' && topPanel && topPanel.state === 'Expanded')
                    offset = 0;

                if (bottomPanel && bottomPanel.state === 'Collapsed' && topPanel && topPanel.state === 'Collapsed')
                    offset = 10;

                if (bottomPanel && bottomPanel.state === 'Expanded' && topPanel && topPanel.state === 'Collapsed')
                    offset = 10;
            }
        }

        if (topPanel && topPanel.pushExpand && topPanel.state === 'Expanded') {
            offset += parseFloat(topPanel.size);
        }
        return offset;
    }
    function getHorizontalLeftOffsets(panel = null) {
        var offset = 0;
        if (panel && panel.state === 'Expanded') 
            offset = 0;
        
        if (panel && panel.state === 'Collapsed') 
            offset = 0;
        
        return offset;
    }

    function setFocusPanelOrder(panel) {
        if (!window.ContainingDivs[containingDivId])
            return;

        const panels = window.ContainingDivs[containingDivId].panels;
        if (!panel.latching) {
            panels.forEach(p => {
                p.isFocused = (p.id === panel.id);
                if (p.state === 'Collapsed') {
                    p.container.style.zIndex = 20;
                }
            });
            panels.sort((a, b) => {
                if (a.isFocused && !b.isFocused) return -1;
                if (!a.isFocused && b.isFocused) return 1;
                return 0;
            });
            panels.forEach((p, i) => {
                if (p.state === 'Expanded') {
                    p.container.style.zIndex = `${20 + (panels.length - i)}`;
                }
                setPanelBounds(p);
            });
            if (window.ContainingDivs[containingDivId].bodyElement)
                setBodyBounds();
        }
    };
    function setLatching(panel) {
        if (!panel.latching && panel.latchingType === 'Vertical') {
            leftPanel = window.ContainingDivs[containingDivId].panels.find(p => p.type === 'Left');
            rightPanel = window.ContainingDivs[containingDivId].panels.find(p => p.type === 'Right');
            if (leftPanel && rightPanel) {
                leftPanel.latching = true;
                rightPanel.latching = true;
                setPanelBounds(leftPanel);
                setPanelBounds(rightPanel);
                justlatched = true;
            }
        }
    }
    function setNotLatching(panel) {
        if (window.ContainingDivs[containingDivId].detachable && panel.latching && panel.latchingType === 'Vertical') {
            leftPanel = window.ContainingDivs[containingDivId].panels.find(p => p.type === 'Left');
            rightPanel = window.ContainingDivs[containingDivId].panels.find(p => p.type === 'Right');
            if (leftPanel && rightPanel) {
                leftPanel.latching = false;
                rightPanel.latching = false;
                leftPanel.enableTransitions();
                rightPanel.enableTransitions();
                leftPanel.makeExpanded();
                rightPanel.makeExpanded();
                setPanelBounds(leftPanel);
                setPanelBounds(rightPanel);
            }
        }
    }
    function setPanelBounds(panel) {
        panel.setPanelTypeClasses();
        if (window.ContainingDivs[containingDivId]?.bounds == null) return;
        const leftPanel = window.ContainingDivs[containingDivId].panels.find(p => p.type === 'Left');
        const rightPanel = window.ContainingDivs[containingDivId].panels.find(p => p.type === 'Right');
        if (panel.latching && panel.latchingType === 'Vertical' && (leftPanel && rightPanel)) {
            leftPanel.makeExpanded();
            rightPanel.makeExpanded();
            panel.container.style.top = `${0 + getVerticalTopOffsets(panel)}px`;
            panel.stateChanger.style.height = `${window.ContainingDivs[containingDivId].bounds.height + getVerticalHeightOffsets(panel)}px`;
            panel.element.style.height = `${window.ContainingDivs[containingDivId].bounds.height + getVerticalHeightOffsets(panel)}px`;
            panel.stateChanger.style.width = "10px";
            leftPanel.container.style.left = "0px";
            leftPanel.element.style.width = leftPanel.size;
            leftPanel.stateChanger.style.left = leftPanel.size;
            rightPanel.container.style.right = `calc(${window.ContainingDivs[containingDivId].bounds.width - 20}px - ${leftPanel.size})`;
            rightPanel.element.style.width = `calc(${window.ContainingDivs[containingDivId].bounds.width - 20}px - ${leftPanel.size})`;
            rightPanel.stateChanger.style.right = `0px`;
            leftPanel.container.style.zIndex = 19;
            rightPanel.container.style.zIndex = 18;
            leftPanel.size = `${leftPanel.element.offsetWidth}px`;
            rightPanel.size = `${rightPanel.element.offsetWidth}px`;
            rightPanel.setPanelStatechangerElementClasses(containingDivId);
            leftPanel.setPanelStatechangerElementClasses(containingDivId);
        } else {
            panel.setPanelStatechangerElementClasses(containingDivId);
            if (panel.type === 'Top') {
                if (panel.state === 'Expanded') {
                    panel.container.style.top = `${getHorizontalLeftOffsets(panel)}px`;
                } else {
                    panel.container.style.top = `-${panel.size}`;
                }
                panel.container.style.left = `0px`;
                panel.element.style.width = `${window.ContainingDivs[containingDivId].bounds.width + getHorizontalWidthOffsets(panel)}px`;
                panel.element.style.height = panel.size;
                panel.stateChanger.style.width = `${window.ContainingDivs[containingDivId].bounds.width + getHorizontalWidthOffsets(panel)}px`;
                panel.stateChanger.style.height = "10px";
                panel.stateChanger.style.top = panel.size;
            } else if (panel.type === 'Bottom') {
                if (panel.state === 'Expanded') {
                    panel.container.style.bottom = panel.size;
                } else {
                    panel.container.style.bottom = `0px`;
                }
                panel.container.style.left = `${getHorizontalLeftOffsets(panel)}px`;
                panel.element.style.width = `${window.ContainingDivs[containingDivId].bounds.width + getHorizontalWidthOffsets(panel)}px`;
                panel.element.style.height = panel.size;
                panel.stateChanger.style.width = `${window.ContainingDivs[containingDivId].bounds.width + getHorizontalWidthOffsets(panel)}px`;
                panel.stateChanger.style.height = "10px";
                panel.stateChanger.style.bottom = "0px";
            } else if (panel.type === 'Left') {
                if (panel.state === 'Expanded') {
                    panel.container.style.left = "0px";
                } else {
                    panel.container.style.left = `-${panel.size}`;
                }
                panel.container.style.top = `${0 + getVerticalTopOffsets(panel)}px`;
                panel.element.style.height = `${window.ContainingDivs[containingDivId].bounds.height + getVerticalHeightOffsets(panel)}px`;
                panel.element.style.width = panel.size;
                panel.stateChanger.style.height = `${window.ContainingDivs[containingDivId].bounds.height + getVerticalHeightOffsets(panel)}px`;
                panel.stateChanger.style.width = "10px";
                panel.stateChanger.style.left = panel.size;
            } else if (panel.type === 'Right') {
                if (panel.state === 'Expanded') {
                    panel.container.style.right = panel.size;
                } else {
                    panel.container.style.right = `0px`;
                }
                panel.container.style.top = `${0 + getVerticalTopOffsets(panel)}px`;
                panel.element.style.height = `${window.ContainingDivs[containingDivId].bounds.height + getVerticalHeightOffsets(panel)}px`;
                panel.element.style.width = panel.size;
                panel.stateChanger.style.height = `${window.ContainingDivs[containingDivId].bounds.height + getVerticalHeightOffsets(panel)}px`;
                panel.stateChanger.style.width = "10px";
                panel.stateChanger.style.right = "0px";
            }
        }
    }
    function setBodyBounds() {
        var bodyELement = window.ContainingDivs[containingDivId].bodyElement;
        var bodyTopOffset = window.ContainingDivs[containingDivId].bodyTopOffset;
        bodyELement.style.height = `${window.ContainingDivs[containingDivId].bounds.height + getVerticalHeightOffsets()}px`;
        bodyELement.style.top = `${bodyTopOffset + getVerticalTopOffsets()}px`;
    }

    const updateBounds = () => {
        window.ContainingDivs[containingDivId].bounds = getContainingDivElementBounds(containingDivId);
        window.ContainingDivs[containingDivId].panels.forEach(panel => {
            if (panel.state !== 'Expanded' && panel.state !== 'Collapsed')
                panel.makeMinimized();

            panel.disableTransitions();

            setPanelBounds(panel);
            if (panel.latching)
                justlatched = true;
        });
        if (window.ContainingDivs[containingDivId].bodyElement)
            setBodyBounds();

        var bodyELement = window.ContainingDivs[containingDivId].bodyElement;
        if (bodyELement)
            bodyELement.style.transition = 'none';
    };

    window.addEventListener('resize', updateBounds);
    var pageElement = document.getElementById(containingDivId);
    if (pageElement) {
        new ResizeObserver(updateBounds).observe(pageElement);
    }
};



