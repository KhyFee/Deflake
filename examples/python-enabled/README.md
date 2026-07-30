# Enable Python triage (stdlib)
# PYTHONPATH must include packages/triager when developing from source
export PYTHONPATH=packages/triager
python -m deflake_triager --selftest
