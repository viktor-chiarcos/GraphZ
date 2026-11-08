"""Graph analysis: chains, cycles, lassos, unreachable blocks."""

from __future__ import annotations

from graphz.model import Block, Project


def analyze_graph(project: Project) -> dict:
    """Analyze a parsed project and return an IR suitable for code generation.

    Returns a dict with:
    - "roots": list of start block tags
    - "chains": list of (tag, successor_tag_or_None) tuples
    - "cycles": list of tags that participate in cycles
    - "unreachable": list of block tags not reachable from any start
    - "iteration_pairs": dict pair_tag -> iteration count string
    """
    project.validate()

    # Build lookup
    blocks_by_tag: dict[str, Block] = {}
    for block in project.blocks:
        tag = block.tag
        if tag is not None:
            blocks_by_tag[tag] = block

    # Find Start blocks (ChosenActionIndex = "-1")
    roots: list[str] = []
    for block in project.blocks:
        if block.chosen_action_index == "-1" and block.tag is not None:
            roots.append(block.tag)

    # Follow OutputLine links, detecting cycles
    chains: list[tuple[str, str | None]] = []
    visited: set[str] = set()
    cyclic_tags: set[str] = set()
    iteration_pairs: dict[str, str] = {}

    def follow(tag: str) -> str | None:
        """Follow OutputLine from tag, return successor tag or None.

        Detects cycles and records iteration info for PairBlock.
        """
        if tag in visited:
            cyclic_tags.add(tag)
            return None

        if tag not in blocks_by_tag:
            return None

        block = blocks_by_tag[tag]
        successor = block.output_line

        if successor is None or successor == "":
            return None

        if successor == tag:
            # Self-loop (e.g., PairBlock pointing at itself)
            cyclic_tags.add(tag)
            visited.add(tag)
            return None

        # Check for PairBlock iteration count
        if block.block_type == "PairBlock" and block.iterations:
            iteration_pairs[tag] = block.iterations

        visited.add(tag)
        succ = follow(successor)
        visited.discard(tag)

        # Record chain
        chains.append((tag, successor if successor is not None else ""))
        return succ

    # Run from each root
    for root in roots:
        if root not in visited:
            follow(root)

    # Collect all tags reachable from roots
    reachable: set[str] = set()

    def collect(tag: str):
        if tag in reachable or tag not in blocks_by_tag:
            return
        reachable.add(tag)
        block = blocks_by_tag[tag]
        succ = block.output_line
        if succ and succ in blocks_by_tag:
            collect(succ)

    for root in roots:
        collect(root)

    # Unreachable blocks
    unreachable: list[str] = []
    for block in project.blocks:
        if block.tag is not None and block.tag not in reachable:
            unreachable.append(block.tag)

    return {
        "roots": roots,
        "chains": chains,
        "cycles": sorted(cyclic_tags),
        "unreachable": unreachable,
        "iteration_pairs": iteration_pairs,
    }
