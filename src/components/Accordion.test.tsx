import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Accordion } from "./Accordion";

const items = [
	{ key: "a", label: "Alpha", body: "Alpha content" },
	{ key: "b", label: "Beta", body: "Beta content" },
	{ key: "c", label: "Gamma", body: "Gamma content" },
];

function renderAccordion(type?: "single" | "multi") {
	return render(
		<Accordion
			items={items}
			renderTrigger={(item) => <span>{item.label}</span>}
			renderContent={(item) => <p>{item.body}</p>}
			type={type}
		/>,
	);
}

describe("Accordion", () => {
	afterEach(cleanup);

	it("renders all trigger labels", () => {
		renderAccordion();
		expect(screen.getByText("Alpha")).toBeDefined();
		expect(screen.getByText("Beta")).toBeDefined();
		expect(screen.getByText("Gamma")).toBeDefined();
	});

	it("does not show any content initially", () => {
		renderAccordion();
		expect(screen.queryByText("Alpha content")).toBeNull();
		expect(screen.queryByText("Beta content")).toBeNull();
		expect(screen.queryByText("Gamma content")).toBeNull();
	});

	it("expands content when trigger is clicked", () => {
		renderAccordion();
		fireEvent.click(screen.getByText("Alpha"));
		expect(screen.getByText("Alpha content")).toBeDefined();
	});

	it("collapses content when the same trigger is clicked again", () => {
		renderAccordion();
		fireEvent.click(screen.getByText("Alpha"));
		expect(screen.getByText("Alpha content")).toBeDefined();

		fireEvent.click(screen.getByText("Alpha"));
		expect(screen.queryByText("Alpha content")).toBeNull();
	});

	describe("type=single (default)", () => {
		it("collapses the previous item when a new one is expanded", () => {
			renderAccordion();
			fireEvent.click(screen.getByText("Alpha"));
			expect(screen.getByText("Alpha content")).toBeDefined();

			fireEvent.click(screen.getByText("Beta"));
			expect(screen.queryByText("Alpha content")).toBeNull();
			expect(screen.getByText("Beta content")).toBeDefined();
		});
	});

	describe("type=multi", () => {
		it("allows multiple items to be expanded at once", () => {
			renderAccordion("multi");
			fireEvent.click(screen.getByText("Alpha"));
			fireEvent.click(screen.getByText("Beta"));

			expect(screen.getByText("Alpha content")).toBeDefined();
			expect(screen.getByText("Beta content")).toBeDefined();
		});

		it("collapses only the clicked item", () => {
			renderAccordion("multi");
			fireEvent.click(screen.getByText("Alpha"));
			fireEvent.click(screen.getByText("Beta"));

			fireEvent.click(screen.getByText("Alpha"));
			expect(screen.queryByText("Alpha content")).toBeNull();
			expect(screen.getByText("Beta content")).toBeDefined();
		});
	});

	it("passes isExpanded to renderTrigger", () => {
		render(
			<Accordion
				items={[{ key: "x", label: "Item" }]}
				renderTrigger={(_item, isExpanded) => (
					<span>{isExpanded ? "Open" : "Closed"}</span>
				)}
				renderContent={() => <p>Content</p>}
			/>,
		);
		expect(screen.getByText("Closed")).toBeDefined();

		fireEvent.click(screen.getByText("Closed"));
		expect(screen.getByText("Open")).toBeDefined();
	});

	it("renders with an empty items array", () => {
		render(
			<Accordion
				items={[]}
				renderTrigger={() => <span>Trigger</span>}
				renderContent={() => <p>Content</p>}
			/>,
		);
		expect(screen.queryByText("Trigger")).toBeNull();
	});
});
