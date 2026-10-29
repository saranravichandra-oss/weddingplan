// Names are editable labels; guests already use stable event IDs.
// Only structured associations change. Notes and original evidence stay intact.
export function renamedReference(kind, data, previous, next, linkedOffer) {
  if (kind === "offers" && data.events?.includes(previous))
    return {
      ...data,
      events: data.events.map((name) => (name === previous ? next : name)),
    };
  if (["tasks", "providers", "costs"].includes(kind) && data.event === previous)
    return { ...data, event: next };
  if (
    kind === "costs" &&
    linkedOffer?.events?.includes(previous) &&
    data.event === linkedOffer.events.join(" + ")
  )
    return {
      ...data,
      event: linkedOffer.events
        .map((name) => (name === previous ? next : name))
        .join(" + "),
    };
  return data;
}
