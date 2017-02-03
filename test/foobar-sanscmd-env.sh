#!/bin/bash

npm run erun -- foobartest sansCmd-env arg1 arg2 > ./test/output/foobartest-sanscmd-env.out
ACTUAL=$( cat ./test/output/foobartest-sanscmd-env.out | grep '^foobartest' )
EXPECTED="foobartest FOO=sansFoo BAR=sansBar FOOBAR=env-sansCmd-sansFoo-sansBar sansCmd env sansCmd env arg1 arg2"

echo "ACTUAL  : ${ACTUAL}"
echo "EXPECTED: ${EXPECTED}"
test "${ACTUAL}" = "${EXPECTED}"
