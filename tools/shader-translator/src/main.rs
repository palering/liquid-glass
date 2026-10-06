use naga::{back::glsl, valid, AddressSpace, ScalarKind, ShaderStage, TypeInner};
use serde_json::{json, Map, Value};
use std::{collections::BTreeMap, env, fs};

fn run() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<String> = env::args().collect();
    if args.len() != 5 {
        return Err("usage: glass-shader-translator input.wgsl vertex|fragment entry output.json".into());
    }
    let source = fs::read_to_string(&args[1])?;
    let module = naga::front::wgsl::parse_str(&source)
        .map_err(|e| e.emit_to_string(&source))?;
    let info = valid::Validator::new(valid::ValidationFlags::all(), valid::Capabilities::empty())
        .validate(&module).map_err(|e| e.emit_to_string(&source))?;
    let stage = match args[2].as_str() {
        "vertex" => ShaderStage::Vertex,
        "fragment" => ShaderStage::Fragment,
        _ => return Err("only WebGL2 vertex and fragment shaders are supported".into()),
    };
    let options = glsl::Options {
        version: glsl::Version::Embedded { version: 300, is_webgl: true },
        ..Default::default()
    };
    let pipeline = glsl::PipelineOptions {
        shader_stage: stage, entry_point: args[3].clone(), multiview: None,
    };
    let mut glsl_source = String::new();
    let reflection = glsl::Writer::new(
        &mut glsl_source, &module, &info, &options, &pipeline, Default::default(),
    )?.write()?;
    let mut textures = BTreeMap::new();
    for (name, mapping) in &reflection.texture_mapping {
        let global = &module.global_variables[mapping.texture];
        textures.insert(global.name.clone().ok_or("unnamed texture")?, json!({
            "name": name, "binding": global.binding.as_ref().ok_or("unbound texture")?.binding,
            "sampler": mapping.sampler.and_then(|h| module.global_variables[h].name.clone()),
        }));
    }
    let mut uniforms = BTreeMap::new();
    for (handle, global) in module.global_variables.iter() {
        if global.space != AddressSpace::Uniform { continue; }
        let TypeInner::Struct { members, span } = &module.types[global.ty].inner else {
            return Err("uniform must be a struct".into());
        };
        let mut fields = Map::new();
        for member in members {
            let (kind, count) = match module.types[member.ty].inner {
                TypeInner::Scalar(s) => (s.kind, 1),
                TypeInner::Vector { size, scalar } => (scalar.kind, size as u32),
                _ => return Err("uniform field must be a 32-bit scalar or vector".into()),
            };
            let kind = match kind { ScalarKind::Float => "f32", ScalarKind::Sint => "i32",
                ScalarKind::Uint => "u32", _ => return Err("unsupported uniform scalar".into()) };
            fields.insert(member.name.clone().ok_or("unnamed uniform field")?,
                json!({"offset": member.offset, "kind": kind, "count": count}));
        }
        // Writer returns the uniform block name; querying it does not depend on
        // mangled member identifiers or postprocessing generated GLSL strings.
        uniforms.insert(global.name.clone().ok_or("unnamed uniform")?, json!({
            "block": reflection.uniforms.get(&handle).ok_or("uniform not reflected")?,
            "binding": global.binding.as_ref().ok_or("unbound uniform")?.binding,
            "size": span, "fields": fields,
        }));
    }
    let value: Value = json!({"compiler":"naga-30.0.0", "stage":args[2], "entry":args[3],
        "wgsl":source, "glsl":glsl_source, "textures":textures, "uniforms":uniforms});
    fs::write(&args[4], serde_json::to_string_pretty(&value)? + "\n")?;
    Ok(())
}
fn main() {
    if let Err(e) = run() { eprintln!("{e}"); std::process::exit(1); }
}
