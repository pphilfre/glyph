import { renderNote } from './rendering';

export const EXAMPLE_SOURCE = String.raw`# Mechanics of a falling body

A short derivation of vertical motion, from Newton’s second law to the conservation of energy.

A falling body is one of the simplest systems we can study. A few carefully chosen assumptions can take us a surprisingly long way.

## Framing the problem

Imagine a body released above a reference plane. Let $y(t)$ denote its height at time $t$, with the upward direction taken as positive.

We make three assumptions:

- The gravitational field is uniform.
- Air resistance is negligible.
- The body can be treated as a point mass.

Near Earth’s surface, these approximations work well over modest distances.

## Equations of motion

Newton’s second law relates the net force to acceleration. Since gravity acts downward, it enters with a minus sign:

$$
m\frac{d^2y}{dt^2} = -mg
$$

The mass cancels. Integrating once gives velocity; integrating again gives position. The constants are the initial velocity $v_0$ and initial height $y_0$.

$$
v(t) = v_0 - gt
$$

$$
y(t) = y_0 + v_0t - \frac{1}{2}gt^2
$$

> For a body released from rest at height $h$, the time of flight is $t_f = \sqrt{\frac{2h}{g}}$. It does not depend on the mass.

## Energy form

In a conservative gravitational field, the sum of kinetic and potential energy stays constant:

$$
\frac{1}{2}mv^2 + mgy = \frac{1}{2}mv_0^2 + mgy_0
$$

This formulation is useful when we care about the speed at a given height, rather than the time taken to reach it.

### If velocity doubles

The kinetic energy is $E_k = \frac{1}{2}mv^2$. Doubling velocity gives:

$$
E_k' = \frac{1}{2}m(2v)^2 = 4E_k
$$

Therefore the kinetic energy increases by a **factor of four**.

## A worked example

Release a sphere from rest at a height of 20 m, taking $g = 9.81\,\mathrm{m/s^2}$. A few lines of Python give the flight time and impact speed.

~~~python
from math import sqrt

height = 20       # metres
gravity = 9.81    # metres / second²

flight_time = sqrt(2 * height / gravity)
impact_speed = gravity * flight_time

print(f"Time: {flight_time:.2f} s")   # 2.02 s
print(f"Speed: {impact_speed:.1f} m/s")  # 19.8 m/s
~~~

| Quantity | Result |
| :--- | ---: |
| Time of flight | 2.02 s |
| Impact speed | 19.8 m/s |

The sphere reaches the reference plane in **2.02 seconds**, moving at approximately **19.8 m/s**. In an experiment, drag and measurement uncertainty will introduce small differences.

## Closing note

The value of a derivation is not only its answer. It makes the assumptions visible, so each can be revisited when the problem calls for a richer model. Return to the [equations of motion](#equations-of-motion) to review the starting point.
`;

export function exampleNote() {
  return renderNote(EXAMPLE_SOURCE, 'mechanics.md');
}
