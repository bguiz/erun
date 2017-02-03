#!/bin/bash

npm run erun -- foobartest sansCmd-subEnv arg1 arg2 > ./test/output/foobartest-sanscmd-subenv.out
ACTUAL=$( cat ./test/output/foobartest-sanscmd-subenv.out | grep '^foobartest' )
EXPECTED="foobartest FOO=sansFoo BAR=sansBar FOOBAR=subEnv-sansCmd-sansFoo-sansBar sansCmd subEnv sansCmd subEnv arg1 arg2"

echo "ACTUAL  : ${ACTUAL}"
echo "EXPECTED: ${EXPECTED}"
test "${ACTUAL}" == "${EXPECTED}"
